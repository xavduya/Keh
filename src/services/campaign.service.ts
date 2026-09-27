/**
 * Campaign service
 *
 * Data-access functions for campaigns and their per-platform posts.
 * Backed by Supabase — RLS scopes every query to the signed-in user's
 * businesses; queries also filter by businessId explicitly.
 */

import type {
  Campaign,
  CampaignGoal,
  EnrichedCampaign,
  Platform,
  PostPerformance,
  PostStatus,
  Product,
  SocialPost,
} from "@/types";
import type {
  CampaignRow,
  InsertSocialPost,
  SocialPostRow,
} from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";
import { getProducts } from "./product.service";

// ─────────────────────────────────────────────────────────────────────────────
// Row → domain mappers
// ─────────────────────────────────────────────────────────────────────────────

function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    businessId: row.business_id,
    productId: row.product_id,
    goal: row.goal,
    promotion: row.promotion ?? undefined,
    duration: row.duration ?? undefined,
    instructions: row.instructions ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toPost(row: SocialPostRow): SocialPost {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    productId: row.product_id,
    platform: row.platform,
    title: row.title,
    caption: row.caption,
    mediaUrl: row.media_url ?? undefined,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at ?? undefined,
    status: row.status,
    externalPostId: row.external_post_id ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export async function getCampaigns(businessId: string): Promise<Campaign[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toCampaign);
}

async function getPostsForCampaigns(campaignIds: string[]): Promise<SocialPost[]> {
  if (campaignIds.length === 0) return [];
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select("*")
    .in("campaign_id", campaignIds)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data.map(toPost);
}

/** All campaigns with their product and posts, newest first. */
export async function getEnrichedCampaigns(businessId: string): Promise<EnrichedCampaign[]> {
  const [campaigns, products] = await Promise.all([
    getCampaigns(businessId),
    getProducts(businessId),
  ]);
  const posts = await getPostsForCampaigns(campaigns.map((c) => c.id));
  const productById = new Map(products.map((p) => [p.id, p]));

  return campaigns.flatMap((campaign) => {
    const product = productById.get(campaign.productId);
    if (!product) return [];
    return [{ ...campaign, product, posts: posts.filter((p) => p.campaignId === campaign.id) }];
  });
}

type LatestMetrics = { reach: number; interactions: number; clicks: number };

/** Latest collected metrics per post (posts without metrics are absent). */
async function getLatestMetrics(postIds: string[]): Promise<Map<string, LatestMetrics>> {
  const latest = new Map<string, LatestMetrics>();
  if (postIds.length === 0) return latest;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("post_metrics")
    .select("*")
    .in("post_id", postIds)
    .order("collected_at", { ascending: false });
  if (error) throw error;

  for (const m of data) {
    if (latest.has(m.post_id)) continue; // rows are newest first
    latest.set(m.post_id, {
      reach: m.reach,
      interactions: m.likes + m.comments + m.shares + m.saves,
      clicks: m.clicks,
    });
  }
  return latest;
}

/**
 * All posts for a business, enriched with their product and latest metrics
 * (0 until metrics have been collected), ordered by scheduled time.
 */
export async function getPosts(businessId: string): Promise<PostPerformance[]> {
  const [campaigns, products] = await Promise.all([
    getCampaigns(businessId),
    getProducts(businessId),
  ]);
  const posts = await getPostsForCampaigns(campaigns.map((c) => c.id));
  const metrics = await getLatestMetrics(posts.map((p) => p.id));
  const productById = new Map(products.map((p) => [p.id, p]));

  return posts.flatMap((post) => {
    const product = productById.get(post.productId);
    if (!product) return [];
    const m = metrics.get(post.id);
    return [{
      ...post,
      product,
      platforms: [post.platform],
      reach: m?.reach ?? 0,
      interactions: m?.interactions ?? 0,
      clicks: m?.clicks ?? 0,
    }];
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────────

export interface NewCampaignInput {
  goal: CampaignGoal;
  product: Product;
  promotion: string;
  duration: string;
  instructions: string;
  title: string;
  /** UTC ISO timestamp */
  scheduledAt: string;
  posts: { platform: Platform; caption: string; status: PostStatus }[];
}

/**
 * Creates a campaign and one post per platform. The campaign's status is
 * derived from its posts by a database trigger. If the posts can't be
 * inserted, the campaign is removed again so no empty campaign is left behind.
 */
export async function createCampaignWithPosts(
  businessId: string,
  input: NewCampaignInput
): Promise<string> {
  const supabase = await createServerClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      business_id: businessId,
      product_id: input.product.id,
      goal: input.goal,
      promotion: input.promotion || null,
      duration: input.duration || null,
      instructions: input.instructions || null,
    })
    .select("id")
    .single();
  if (campaignError) throw campaignError;

  const rows: InsertSocialPost[] = input.posts.map((post) => ({
    campaign_id: campaign.id,
    product_id: input.product.id,
    platform: post.platform,
    title: input.title,
    caption: post.caption,
    media_url: input.product.imageUrl || null,
    scheduled_at: input.scheduledAt,
    published_at: null,
    status: post.status,
    external_post_id: null,
  }));

  const { error: postsError } = await supabase.from("social_posts").insert(rows);
  if (postsError) {
    await supabase.from("campaigns").delete().eq("id", campaign.id);
    throw postsError;
  }

  return campaign.id;
}
