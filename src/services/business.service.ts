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
} from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";

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
