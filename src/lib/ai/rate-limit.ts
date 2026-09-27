/**
 * Per-user AI rate limit (migration 009), shared by the assistant route and
 * recommendation generation. Server-only.
 *
 * Only language-model calls count: callers check usesModel() first, and
 * guided (rules-based) answers are free. The daily cap comes from the
 * business's plan (SUBSCRIPTION_PLANS.aiRequestsPerDay).
 */

import type { SubscriptionPlan } from "@/types";
import { SUBSCRIPTION_PLANS } from "@/constants";
import { createServerClient } from "@/lib/supabase/server";

const PER_MINUTE = 6;

/** Daily model calls for a plan (the Free plan's when unknown). */
export function aiRequestsPerDay(plan?: SubscriptionPlan): number {
  const meta = SUBSCRIPTION_PLANS.find((p) => p.id === plan) ?? SUBSCRIPTION_PLANS[0];
  return meta.aiRequestsPerDay;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number; message: string; unavailable?: boolean };

/**
 * Records one AI request for the signed-in user and says whether it's
 * allowed. Fails closed if the limiter itself is unavailable (e.g. migration
 * 009 not applied): `unavailable` is set so callers can answer from the
 * guided engine instead of the model.
 */
export async function consumeAiRequest(plan?: SubscriptionPlan): Promise<RateLimitResult> {
  const perDay = aiRequestsPerDay(plan);
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("consume_ai_request", {
    per_minute: PER_MINUTE,
    per_day: perDay,
  });
  if (error) {
    console.error("AI rate limiter unavailable — is migration 009 applied? Using guided mode.", error.message);
    return {
      allowed: false,
      unavailable: true,
      retryAfter: 60,
      message: "Keh's AI is unavailable right now. Please try again later.",
    };
  }

  const result = data?.[0];
  if (result?.allowed) return { allowed: true };

  const retryAfter = Math.max(1, result?.retry_after_seconds ?? 60);
  const message =
    retryAfter <= 60
      ? `You're asking quickly — give Keh ${retryAfter} second${retryAfter === 1 ? "" : "s"} and try again.`
      : `You've reached today's limit of ${perDay} AI requests on your plan. It resets within ${Math.ceil(retryAfter / 3600)} hours.`;
  return { allowed: false, retryAfter, message };
}
