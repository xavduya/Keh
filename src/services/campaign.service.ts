/**
 * Campaign service
 *
 * Provides data-access functions for campaigns and posts.
 * Currently backed by mock data. Replace the implementations with
 * Supabase queries — the function signatures will not change.
 *
 * Until then, every business sees the same sample campaigns (businessId is
 * ignored) so the demo stays populated for real signed-in users.
 */

import type { Campaign, SocialPost, EnrichedPost, EnrichedCampaign } from "@/types";
import { mockCampaigns, mockPosts, mockEnrichedPosts } from "@/data/mock-posts";
import { mockProducts } from "@/data/mock-products";

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────────

export async function getCampaigns(businessId: string): Promise<Campaign[]> {
  void businessId;
  return mockCampaigns;
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  return mockCampaigns.find((c) => c.id === id) ?? null;
}

export async function getEnrichedCampaign(
  id: string
): Promise<EnrichedCampaign | null> {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;

  const product = mockProducts.find((p) => p.id === campaign.productId);
  const posts = mockPosts.filter((p) => p.campaignId === id);

  return {
    ...campaign,
    product: product ?? mockProducts[0],
    posts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────────────

export async function getPosts(businessId: string): Promise<EnrichedPost[]> {
  void businessId;
  return mockEnrichedPosts;
}

export async function getPostById(id: string): Promise<SocialPost | null> {
  return mockPosts.find((p) => p.id === id) ?? null;
}
