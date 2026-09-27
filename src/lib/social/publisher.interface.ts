/**
 * Social publisher interface
 *
 * One adapter per platform that Keh can post to by API (Facebook Pages,
 * Instagram Business). TikTok has no publishing API for Keh: its posts are
 * prepared as ACTION_REQUIRED and the owner posts them.
 *
 * Scheduling is Keh's job, not the platform's: the publish job
 * (services/publishing.service.ts, run by /api/cron/publish) calls
 * publish() when a post is due.
 */

import type { Platform } from "@/types";

export interface PublishablePost {
  id: string;
  platform: Platform;
  caption: string;
  /** Public image URL (the product photo), if any. */
  mediaUrl?: string;
}

export interface PublishAccount {
  /** Facebook Page ID or Instagram Business account ID. */
  accountId: string;
  accessToken: string;
}

export type PublishResult =
  | { ok: true; externalPostId: string }
  /** `error` is shown to the owner — plain language, no API jargon. */
  | { ok: false; error: string };

/** Counts for one post at one point in time (a post_metrics row). */
export interface PostInsights {
  reach: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface SocialPublisher {
  publish(post: PublishablePost, account: PublishAccount): Promise<PublishResult>;
  /** Latest counts for a published post. Missing numbers are 0. */
  getInsights(externalPostId: string, account: PublishAccount): Promise<PostInsights>;
}
