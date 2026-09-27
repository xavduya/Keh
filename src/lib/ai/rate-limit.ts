/**
 * Per-user AI rate limit (migration 009), shared by the assistant route and
 * recommendation generation. Server-only.
 */

import { createServerClient } from "@/lib/supabase/server";

/** Per signed-in user; every AI request counts (model or guided). */
export const AI_LIMITS = { perMinute: 8, perDay: 100 };

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number; message: string };

/**
 * Records one AI request for the signed-in user and says whether it's
 * allowed. Fails open (allowed) if the limiter itself is unavailable, e.g.
 * migration 009 not applied — the error is logged.
 */
export async function consumeAiRequest(): Promise<RateLimitResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("consume_ai_request", {
    per_minute: AI_LIMITS.perMinute,
    per_day: AI_LIMITS.perDay,
  });
  if (error) {
    console.error("AI rate limiter unavailable — is migration 009 applied?", error.message);
    return { allowed: true };
  }

  const result = data?.[0];
  if (result?.allowed) return { allowed: true };

  const retryAfter = Math.max(1, result?.retry_after_seconds ?? 60);
  const message =
    retryAfter <= 60
      ? `You're asking quickly — give Keh ${retryAfter} second${retryAfter === 1 ? "" : "s"} and try again.`
      : `You've reached today's limit of ${AI_LIMITS.perDay} AI requests. It resets within ${Math.ceil(retryAfter / 3600)} hours.`;
  return { allowed: false, retryAfter, message };
}
