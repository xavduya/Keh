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
import { chunk } from "./batch";

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
    lastError: row.last_error ?? undefined,
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
  const batches = await Promise.all(
    chunk(campaignIds).map(async (ids) => {
      const { data, error } = await supabase.from("social_posts").select("*").in("campaign_id", ids);
      if (error) throw error;
      return data;
    })
  );
  return batches
    .flat()
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map(toPost);
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
  // Each post's rows land in a single batch, so "newest first" holds per post.
  const batches = await Promise.all(
    chunk(postIds).map(async (ids) => {
      const { data, error } = await supabase
        .from("post_metrics")
        .select("*")
        .in("post_id", ids)
        .order("collected_at", { ascending: false });
      if (error) throw error;
      return data;
    })
  );

  for (const m of batches.flat()) {
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

/** One campaign with its product and posts, or null if it isn't this business's. */
export async function getCampaignWithPosts(
  businessId: string,
  campaignId: string
): Promise<EnrichedCampaign | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const campaign = toCampaign(data);
  const [posts, products] = await Promise.all([getPostsForCampaigns([campaign.id]), getProducts(businessId)]);
  const product = products.find((p) => p.id === campaign.productId);
  return product ? { ...campaign, product, posts } : null;
}

/**
 * Updates a campaign and brings its posts in line with `input.posts`:
 * existing platforms are updated in place, new ones inserted, dropped ones
 * deleted. Deletes run first and updates last, so the derive_campaign_status
 * trigger (which ignores deletes) recomputes the campaign's status.
 */
export async function updateCampaignWithPosts(
  businessId: string,
  campaignId: string,
  input: NewCampaignInput
): Promise<void> {
  const supabase = await createServerClient();

  const { error: campaignError } = await supabase
    .from("campaigns")
    .update({
      product_id: input.product.id,
      goal: input.goal,
      promotion: input.promotion || null,
      duration: input.duration || null,
      instructions: input.instructions || null,
    })
    .eq("id", campaignId)
    .eq("business_id", businessId);
  if (campaignError) throw campaignError;

  const existing = await getPostsForCampaigns([campaignId]);
  const wanted = new Map(input.posts.map((p) => [p.platform, p]));

  const removed = existing.filter((p) => !wanted.has(p.platform)).map((p) => p.id);
  if (removed.length > 0) {
    const { error } = await supabase.from("social_posts").delete().in("id", removed);
    if (error) throw error;
  }

  const added = input.posts.filter((p) => !existing.some((e) => e.platform === p.platform));
  if (added.length > 0) {
    const { error } = await supabase.from("social_posts").insert(
      added.map((post) => ({
        campaign_id: campaignId,
        product_id: input.product.id,
        platform: post.platform,
        title: input.title,
        caption: post.caption,
        media_url: input.product.imageUrl || null,
        scheduled_at: input.scheduledAt,
        published_at: null,
        status: post.status,
        external_post_id: null,
      }))
    );
    if (error) throw error;
  }

  for (const post of existing.filter((p) => wanted.has(p.platform))) {
    const next = wanted.get(post.platform)!;
    const { error } = await supabase
      .from("social_posts")
      .update({
        product_id: input.product.id,
        title: input.title,
        caption: next.caption,
        media_url: input.product.imageUrl || null,
        scheduled_at: input.scheduledAt,
        status: next.status,
      })
      .eq("id", post.id);
    if (error) throw error;
  }
}

/** Deletes a campaign; its posts and their metrics cascade. */
export async function deleteCampaign(businessId: string, campaignId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId).eq("business_id", businessId);
  if (error) throw error;
}

/** How many campaigns use a product (they block deleting it). */
export async function countCampaignsForProduct(businessId: string, productId: string): Promise<number> {
  const supabase = await createServerClient();
  const { count, error } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("product_id", productId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Marks a TikTok post the owner posted themselves as published. Only
 * ACTION_REQUIRED TikTok posts; RLS limits it to the owner's posts.
 * Returns false when there was no such post.
 */
export async function markPostedManually(postId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("social_posts")
    .update({ status: "PUBLISHED", published_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("platform", "TIKTOK")
    .eq("status", "ACTION_REQUIRED")
    .select("id");
  if (error) throw error;
  return data.length > 0;
}
