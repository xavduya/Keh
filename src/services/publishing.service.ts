/**
 * Publishing and metrics jobs (server-only, secret key).
 *
 * publishDuePosts — claims SCHEDULED posts whose time has come (migration
 *   015's claim_due_posts, so parallel runs never double-post), publishes
 *   each through its platform's SocialPublisher, and records the outcome:
 *   PUBLISHED with the platform's post ID, or FAILED with a plain-language
 *   reason the owner sees.
 * collectMetrics — saves a post_metrics row per recently published post.
 *
 * Both run from /api/cron/* (pg_cron, migration 016); publishDuePosts also
 * runs right away for "Publish now".
 */

import type { Platform } from "@/types";
import { createAdminClient } from "@/lib/supabase/server";
import { getPublisher } from "@/lib/social/publishers";
import type { PublishAccount, PublishResult } from "@/lib/social/publisher.interface";
import { getPublishingAccount } from "./social-account.service";

const PLATFORM_NAMES: Record<Platform, string> = { FACEBOOK: "Facebook Page", INSTAGRAM: "Instagram account", TIKTOK: "TikTok" };

export interface PublishRunResult {
  published: number;
  failed: number;
  /** Posts found stuck in PUBLISHING from an earlier, interrupted run. */
  interrupted: number;
}

/**
 * Publishes due posts: all of them (the job), or just one campaign's
 * ("Publish now"). Never throws for a single post; each gets a status.
 */
export async function publishDuePosts({
  campaignId,
  limit = 20,
}: { campaignId?: string; limit?: number } = {}): Promise<PublishRunResult> {
  const admin = createAdminClient();
  const result: PublishRunResult = { published: 0, failed: 0, interrupted: 0 };

  if (!campaignId) {
    const { data, error } = await admin.rpc("fail_stuck_posts", { p_minutes: 15 });
    if (error) throw error;
    result.interrupted = data ?? 0;
  }

  const { data: posts, error } = await admin.rpc("claim_due_posts", {
    p_limit: limit,
    p_campaign_id: campaignId ?? null,
  });
  if (error) throw error;

  // Accounts are looked up once per business and platform.
  const accounts = new Map<string, PublishAccount | null>();

  for (const post of posts ?? []) {
    let outcome: PublishResult;
    try {
      const key = `${post.business_id}:${post.platform}`;
      if (!accounts.has(key)) accounts.set(key, await getPublishingAccount(post.business_id, post.platform));
      const account = accounts.get(key);
      const publisher = getPublisher(post.platform);

      if (!publisher) {
        outcome = { ok: false, error: "Keh can't post to TikTok for you. Post it yourself, then mark it as posted." };
      } else if (!account) {
        outcome = {
          ok: false,
          error: `Connect your ${PLATFORM_NAMES[post.platform]} in Social accounts, then reschedule this campaign.`,
        };
      } else {
        outcome = await publisher.publish(
          { id: post.id, platform: post.platform, caption: post.caption, mediaUrl: post.media_url ?? undefined },
          account
        );
      }
    } catch (err) {
      console.error("Publishing post failed", post.id, err);
      outcome = { ok: false, error: "Something went wrong while posting. Try rescheduling this campaign." };
    }

    const { error: updateError } = await admin
      .from("social_posts")
      .update(
        outcome.ok
          ? {
              status: "PUBLISHED",
              published_at: new Date().toISOString(),
              external_post_id: outcome.externalPostId,
              last_error: null,
            }
          : { status: "FAILED", last_error: outcome.error }
      )
      .eq("id", post.id);
    // If this fails the post stays PUBLISHING and the next run marks it
    // interrupted — never re-published, so never posted twice.
    if (updateError) console.error("Could not record publish result", post.id, updateError.message);

    if (outcome.ok) result.published++;
    else result.failed++;
  }

  return result;
}

export interface MetricsRunResult {
  collected: number;
  failed: number;
}

/** Saves the latest counts for recently published Facebook / Instagram posts. */
export async function collectMetrics({ days = 30, limit = 200 } = {}): Promise<MetricsRunResult> {
  const admin = createAdminClient();
  const { data: posts, error } = await admin.rpc("posts_for_metrics", { p_days: days, p_limit: limit });
  if (error) throw error;

  const result: MetricsRunResult = { collected: 0, failed: 0 };
  const accounts = new Map<string, PublishAccount | null>();

  for (const post of posts ?? []) {
    try {
      const key = `${post.business_id}:${post.platform}`;
      if (!accounts.has(key)) accounts.set(key, await getPublishingAccount(post.business_id, post.platform));
      const account = accounts.get(key);
      const publisher = getPublisher(post.platform);
      if (!account || !publisher) continue; // disconnected since publishing

      const insights = await publisher.getInsights(post.external_post_id, account);
      const { error: insertError } = await admin.from("post_metrics").insert({ post_id: post.id, ...insights, watch_time: null });
      if (insertError) throw insertError;
      result.collected++;
    } catch (err) {
      console.error("Collecting metrics failed", post.id, err);
      result.failed++;
    }
  }
  return result;
}
