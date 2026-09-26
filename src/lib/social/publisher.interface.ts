/**
 * Social publisher interface
 *
 * All social platform adapters must implement this interface.
 * Campaign and scheduling code should depend on this interface,
 * not on any specific platform's API.
 *
 * NOTE: This is a stub. Implement in Phase 7.
 *
 * Concrete implementations:
 *   FacebookPublisher   — lib/social/facebook.publisher.ts
 *   InstagramPublisher  — lib/social/instagram.publisher.ts
 *   TikTokPublisher     — lib/social/tiktok.publisher.ts  (Phase 7+)
 */

import type { SocialPost, PostMetric } from "@/types";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

export interface SocialPublisher {
  /**
   * Publish a post immediately to the platform.
   */
  publish(post: SocialPost): Promise<PublishResult>;

  /**
   * Schedule a post for future publication.
   * Some platforms (e.g. TikTok) do not support server-side scheduling
   * and will return a manual-action result.
   */
  schedule(post: SocialPost): Promise<PublishResult>;

  /**
   * Retrieve current performance metrics for a published post.
   */
  getMetrics(externalPostId: string): Promise<Partial<PostMetric>>;
}

export {}; // Placeholder — remove when implementing
