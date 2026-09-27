/**
 * Business service
 *
 * Data-access functions for the current business, its brand profile,
 * and subscription. Backed by Supabase (RLS scopes every query to
 * businesses owned by the signed-in user).
 */

import type { Business, BrandProfile, Subscription } from "@/types";
import type {
  BusinessRow,
  BrandProfileRow,
  SubscriptionRow,
  UpdateBusiness,
  UpdateBrandProfile,
} from "@/lib/supabase/database.types";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Row → domain mappers
// ─────────────────────────────────────────────────────────────────────────────

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    industry: row.industry,
    location: row.location,
    targetAudience: row.target_audience,
    preferredLanguage: row.preferred_language,
    phone: row.phone,
    website: row.website,
    operatingHours: row.operating_hours,
    delivery: row.delivery ?? undefined,
    payment: row.payment ?? undefined,
    audienceAgeGroup: row.audience_age_group ?? undefined,
    audienceInterests: row.audience_interests ?? undefined,
    // undefined = migration 017 not applied yet: don't send anyone to onboarding.
    onboarded: row.onboarded_at !== null,
    createdAt: row.created_at,
  };
}

function toBrandProfile(row: BrandProfileRow): BrandProfile {
  return {
    businessId: row.business_id,
    tone: row.tone,
    preferredLanguage: row.preferred_language,
    brandColors: row.brand_colors,
    logoUrl: row.logo_url ?? undefined,
    brandImageUrl: row.brand_image_url ?? undefined,
    defaultCTA: row.default_cta,
    brandGuidelines: row.brand_guidelines ?? undefined,
  };
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    businessId: row.business_id,
    plan: row.plan,
    pricePerMonth: Number(row.price_per_month),
    currency: row.currency,
    renewsAt: row.renews_at,
    usage: {
      aiCampaignsUsed: row.ai_campaigns_used,
      aiCampaignsLimit: row.ai_campaigns_limit,
      scheduledPostsUsed: row.scheduled_posts_used,
      scheduledPostsLimit: row.scheduled_posts_limit,
      resetsAt: row.usage_resets_at,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Business
// ─────────────────────────────────────────────────────────────────────────────

export async function getBusiness(businessId: string): Promise<Business | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (error) throw error;
  return data ? toBusiness(data) : null;
}

/** The user's first business (the sign-up trigger creates exactly one). */
export async function getBusinessByOwnerId(
  ownerId: string
): Promise<Business | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toBusiness(data) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand profile
// ─────────────────────────────────────────────────────────────────────────────

export async function getBrandProfile(
  businessId: string
): Promise<BrandProfile | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  return data ? toBrandProfile(data) : null;
}

/** Business details editable on the brand page. */
export type BusinessDetails = Pick<
  Business,
  | "name" | "description" | "industry" | "location" | "operatingHours" | "phone"
  | "website" | "delivery" | "payment" | "targetAudience" | "audienceAgeGroup"
  | "audienceInterests" | "preferredLanguage"
>;

export async function updateBusiness(
  businessId: string,
  details: BusinessDetails
): Promise<void> {
  const fields: UpdateBusiness = {
    name: details.name,
    description: details.description,
    industry: details.industry,
    location: details.location,
    operating_hours: details.operatingHours,
    phone: details.phone,
    website: details.website,
    delivery: details.delivery || null,
    payment: details.payment || null,
    target_audience: details.targetAudience,
    audience_age_group: details.audienceAgeGroup || null,
    audience_interests: details.audienceInterests || null,
    preferred_language: details.preferredLanguage,
  };
  const supabase = await createServerClient();
  const { error } = await supabase.from("businesses").update(fields).eq("id", businessId);
  if (error) throw error;
}

/** Marks onboarding as finished (or skipped). */
export async function markOnboarded(businessId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("businesses")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", businessId);
  if (error) throw error;
}

/** Brand voice fields; image URLs are only changed when provided. */
export type BrandProfileUpdate = Omit<BrandProfile, "businessId">;

export async function updateBrandProfile(
  businessId: string,
  profile: BrandProfileUpdate
): Promise<void> {
  const fields: UpdateBrandProfile = {
    tone: profile.tone,
    preferred_language: profile.preferredLanguage,
    brand_colors: profile.brandColors,
    default_cta: profile.defaultCTA,
    brand_guidelines: profile.brandGuidelines || null,
    ...(profile.logoUrl !== undefined && { logo_url: profile.logoUrl }),
    ...(profile.brandImageUrl !== undefined && { brand_image_url: profile.brandImageUrl }),
  };
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("brand_profiles")
    .update(fields)
    .eq("business_id", businessId)
    .select("id");
  if (error) throw error;

  // Sign-up creates the brand profile; create it here only if it's missing.
  if (data.length === 0) {
    const { error: insertError } = await supabase.from("brand_profiles").insert({
      business_id: businessId,
      tone: profile.tone,
      preferred_language: profile.preferredLanguage,
      brand_colors: profile.brandColors,
      default_cta: profile.defaultCTA,
      brand_guidelines: profile.brandGuidelines || null,
      logo_url: profile.logoUrl ?? null,
      brand_image_url: profile.brandImageUrl ?? null,
    });
    if (insertError) throw insertError;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubscription(
  businessId: string
): Promise<Subscription | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  return data ? toSubscription(data) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan usage (migration 010)
// ─────────────────────────────────────────────────────────────────────────────

export type QuotaResult =
  | { allowed: true }
  | { allowed: false; reason: "ai_campaigns" | "scheduled_posts" | "not_owner" | "no_subscription" }
  /** The usage functions aren't available (e.g. migration 010 not applied). */
  | { allowed: true; unavailable: true };

/**
 * Counts one campaign (and its scheduled posts) against the plan's monthly
 * limits, atomically. Call before creating the campaign; if creating it then
 * fails, call releaseCampaignQuota with the same numbers.
 */
export async function consumeCampaignQuota(
  businessId: string,
  scheduledPosts: number
): Promise<QuotaResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("consume_campaign_quota", {
    p_business_id: businessId,
    p_scheduled_posts: scheduledPosts,
  });
  if (error) {
    console.error("Plan usage check unavailable — is migration 010 applied?", error.message);
    return { allowed: true, unavailable: true };
  }
  const result = data?.[0];
  if (result?.allowed) return { allowed: true };
  return { allowed: false, reason: (result?.reason ?? "no_subscription") as "ai_campaigns" };
}

/**
 * Counts extra scheduled posts from editing a campaign (migration 014) —
 * editing isn't a new campaign, so only the posts are counted.
 */
export async function consumeScheduledPostQuota(
  businessId: string,
  extraPosts: number
): Promise<QuotaResult> {
  if (extraPosts <= 0) return { allowed: true };
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("consume_scheduled_posts", {
    p_business_id: businessId,
    p_count: extraPosts,
  });
  if (error) {
    console.error("Scheduled-post check unavailable — is migration 014 applied?", error.message);
    return { allowed: true, unavailable: true };
  }
  const result = data?.[0];
  if (result?.allowed) return { allowed: true };
  return { allowed: false, reason: (result?.reason ?? "no_subscription") as "scheduled_posts" };
}

/**
 * Gives back usage counted by consumeCampaignQuota when the campaign could
 * not be saved. Server-only: runs with the secret key, because owners must
 * not be able to lower their own counters.
 */
export async function releaseCampaignQuota(
  businessId: string,
  scheduledPosts: number
): Promise<void> {
  const { error } = await createAdminClient().rpc("release_campaign_quota", {
    p_business_id: businessId,
    p_scheduled_posts: scheduledPosts,
  });
  if (error) console.error("Could not release plan usage", error.message);
}
