/**
 * Facebook Page and Instagram Business publishers (Meta Graph API).
 * Server-only. See publisher.interface.ts.
 */

import type { Platform } from "@/types";
import { graph, MetaApiError } from "./meta";
import type { PostInsights, PublishAccount, PublishablePost, PublishResult, SocialPublisher } from "./publisher.interface";

const EMPTY_INSIGHTS: PostInsights = {
  reach: 0,
  impressions: 0,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: 0,
};

/** Meta error code for an invalid, expired or revoked token. */
const INVALID_TOKEN = 190;

/** An owner-facing reason for a failed publish; Meta's details go to the log. */
function publishError(platform: "Facebook" | "Instagram", err: unknown): PublishResult {
  console.error(`${platform} publish failed`, err);
  if (err instanceof MetaApiError && err.code === INVALID_TOKEN) {
    return {
      ok: false,
      error: `Keh's access to your ${platform} account has expired. Reconnect it in Social accounts, then reschedule this campaign.`,
    };
  }
  const detail = err instanceof MetaApiError ? ` (${platform} said: ${err.message.replace(/^[^:]*: /, "").slice(0, 160)})` : "";
  return { ok: false, error: `${platform} didn't accept this post${detail}. Try rescheduling it.` };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Facebook Page
// ─────────────────────────────────────────────────────────────────────────────

type InsightsResponse = { data?: { name: string; values?: { value: number | Record<string, number> }[] }[] };

function insightValue(response: InsightsResponse | undefined, name: string): number {
  const value = response?.data?.find((m) => m.name === name)?.values?.[0]?.value;
  return typeof value === "number" ? value : 0;
}

export const facebookPublisher: SocialPublisher = {
  async publish(post, { accountId, accessToken }) {
    try {
      // With a photo: a photo post (its feed post ID is post_id); otherwise a text post.
      if (post.mediaUrl) {
        const res = await graph<{ id: string; post_id?: string }>(
          `${accountId}/photos`,
          { url: post.mediaUrl, caption: post.caption, access_token: accessToken },
          "POST"
        );
        return { ok: true, externalPostId: res.post_id ?? res.id };
      }
      const res = await graph<{ id: string }>(
        `${accountId}/feed`,
        { message: post.caption, access_token: accessToken },
        "POST"
      );
      return { ok: true, externalPostId: res.id };
    } catch (err) {
      return publishError("Facebook", err);
    }
  },

  async getInsights(postId, { accessToken }) {
    // Engagement counts are always available; reach/clicks need read_insights
    // and Meta renames insight metrics from time to time, so they're optional.
    const engagement = await graph<{
      reactions?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    }>(postId, {
      fields: "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares",
      access_token: accessToken,
    });

    let insights: InsightsResponse | undefined;
    try {
      insights = await graph<InsightsResponse>(`${postId}/insights`, {
        metric: "post_impressions_unique,post_impressions,post_clicks",
        access_token: accessToken,
      });
    } catch (err) {
      console.warn("Facebook post insights unavailable", postId, err instanceof Error ? err.message : err);
    }

    return {
      ...EMPTY_INSIGHTS,
      reach: insightValue(insights, "post_impressions_unique"),
      impressions: insightValue(insights, "post_impressions"),
      clicks: insightValue(insights, "post_clicks"),
      likes: engagement.reactions?.summary?.total_count ?? 0,
      comments: engagement.comments?.summary?.total_count ?? 0,
      shares: engagement.shares?.count ?? 0,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Instagram Business
// ─────────────────────────────────────────────────────────────────────────────

/** How long to wait for Instagram to process an image before publishing it. */
const CONTAINER_POLL_ATTEMPTS = 5;
const CONTAINER_POLL_MS = 1500;

export const instagramPublisher: SocialPublisher = {
  async publish(post, { accountId, accessToken }) {
    if (!post.mediaUrl) {
      return {
        ok: false,
        error: "Instagram posts need a photo. Add one to the product, then reschedule this campaign.",
      };
    }
    try {
      // 1. Upload the image into a media container.
      const container = await graph<{ id: string }>(
        `${accountId}/media`,
        { image_url: post.mediaUrl, caption: post.caption, access_token: accessToken },
        "POST"
      );

      // 2. Wait until Instagram has processed it.
      for (let attempt = 1; attempt <= CONTAINER_POLL_ATTEMPTS; attempt++) {
        const { status_code } = await graph<{ status_code?: string }>(container.id, {
          fields: "status_code",
          access_token: accessToken,
        });
        if (status_code === "FINISHED") break;
        if (status_code === "ERROR" || status_code === "EXPIRED") {
          return {
            ok: false,
            error: "Instagram couldn't use this product photo. It needs to be a JPG image; upload one, then reschedule.",
          };
        }
        if (attempt === CONTAINER_POLL_ATTEMPTS) {
          return { ok: false, error: "Instagram took too long to process the photo. Try rescheduling this campaign." };
        }
        await sleep(CONTAINER_POLL_MS);
      }

      // 3. Publish it.
      const published = await graph<{ id: string }>(
        `${accountId}/media_publish`,
        { creation_id: container.id, access_token: accessToken },
        "POST"
      );
      return { ok: true, externalPostId: published.id };
    } catch (err) {
      return publishError("Instagram", err);
    }
  },

  async getInsights(mediaId, { accessToken }) {
    // Meta retires media metrics now and then; try the current set, then a
    // smaller one, then the plain counts on the media object.
    for (const metric of ["reach,likes,comments,shares,saved,views", "reach,likes,comments,saved"]) {
      try {
        const res = await graph<InsightsResponse>(`${mediaId}/insights`, { metric, access_token: accessToken });
        return {
          ...EMPTY_INSIGHTS,
          reach: insightValue(res, "reach"),
          views: insightValue(res, "views"),
          likes: insightValue(res, "likes"),
          comments: insightValue(res, "comments"),
          shares: insightValue(res, "shares"),
          saves: insightValue(res, "saved"),
        };
      } catch (err) {
        console.warn("Instagram insights unavailable", mediaId, metric, err instanceof Error ? err.message : err);
      }
    }
    const counts = await graph<{ like_count?: number; comments_count?: number }>(mediaId, {
      fields: "like_count,comments_count",
      access_token: accessToken,
    });
    return { ...EMPTY_INSIGHTS, likes: counts.like_count ?? 0, comments: counts.comments_count ?? 0 };
  },
};

/** The publisher for a platform, or null for TikTok (posted by the owner). */
export function getPublisher(platform: Platform): SocialPublisher | null {
  if (platform === "FACEBOOK") return facebookPublisher;
  if (platform === "INSTAGRAM") return instagramPublisher;
  return null;
}

export type { PublishAccount, PublishablePost };
