/**
 * Billing service (server-only, secret key).
 *
 * Owners can read their subscription but never write it (RLS, migration
 * 004), so plan changes go through here — called by the billing provider
 * once a change is allowed (the demo provider immediately; a real provider
 * from its payment webhook).
 */

import { SUBSCRIPTION_PLANS } from "@/constants";
import { createAdminClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/types";

export function isPlan(value: unknown): value is SubscriptionPlan {
  return SUBSCRIPTION_PLANS.some((p) => p.id === value);
}

/**
 * Switches a business to a plan: price and monthly limits come from
 * SUBSCRIPTION_PLANS. This month's usage is kept, so a downgrade below
 * what's already used blocks new campaigns until the next reset.
 */
export async function applyPlan(businessId: string, plan: SubscriptionPlan): Promise<void> {
  const meta = SUBSCRIPTION_PLANS.find((p) => p.id === plan);
  if (!meta) throw new Error(`Unknown plan ${plan}`);

  const { error } = await createAdminClient()
    .from("subscriptions")
    .update({
      plan,
      price_per_month: meta.pricePerMonth,
      ai_campaigns_limit: meta.aiCampaignsPerMonth,
      scheduled_posts_limit: meta.scheduledPostsPerMonth,
    })
    .eq("business_id", businessId);
  if (error) throw error;
}
