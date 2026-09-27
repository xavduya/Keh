"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { buildMarketingContext } from "@/lib/ai/context";
import { activeProvider } from "@/lib/ai/providers";
import { consumeAiRequest } from "@/lib/ai/rate-limit";
import { generateRecommendations } from "@/lib/ai/recommendations";
import { getSubscription } from "@/services/business.service";
import {
  dismissRecommendation as dismiss,
  getRecommendationState,
  RECOMMENDATION_REFRESH_COOLDOWN_MINUTES,
  replaceRecommendations,
} from "@/services/recommendation.service";

export type RefreshResult = { updated: boolean; error?: string };

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/assistant");
}

/**
 * Generates this week's recommendations. Without `force`, only when they're
 * due (called automatically by the pages); with `force` ("New ideas"), at
 * most once per RECOMMENDATION_REFRESH_COOLDOWN_MINUTES.
 */
export async function refreshRecommendations({ force = false } = {}): Promise<RefreshResult> {
  const { business } = await getCurrentContext();

  const state = await getRecommendationState(business.id);
  if (!force && !state.stale) return { updated: false };
  if (force && state.lastGeneratedAt) {
    const minutesAgo = (Date.now() - new Date(state.lastGeneratedAt).getTime()) / 60_000;
    if (minutesAgo < RECOMMENDATION_REFRESH_COOLDOWN_MINUTES) {
      const wait = Math.ceil(RECOMMENDATION_REFRESH_COOLDOWN_MINUTES - minutesAgo);
      return {
        updated: false,
        error: `Keh wrote these ideas ${Math.max(1, Math.floor(minutesAgo))} min ago. You can ask for new ones in ${wait} min.`,
      };
    }
  }

  // Only a model call counts against the plan's limit; rules are free.
  let allowModel = activeProvider() !== null;
  if (allowModel) {
    const subscription = await getSubscription(business.id).catch(() => null);
    const limit = await consumeAiRequest(subscription?.plan);
    if (!limit.allowed && !limit.unavailable) {
      return { updated: false, error: force ? limit.message : undefined };
    }
    allowModel = limit.allowed;
  }

  try {
    const data = await buildMarketingContext(business);
    const recommendations = await generateRecommendations(data, { allowModel });
    await replaceRecommendations(business.id, recommendations);
  } catch (err) {
    console.error("refreshRecommendations failed", err);
    return { updated: false, error: force ? "Keh couldn't come up with new ideas right now. Please try again." : undefined };
  }

  revalidate();
  return { updated: true };
}

/** "Not now": hides a recommendation; the next one takes its place. */
export async function dismissRecommendation(id: string): Promise<void> {
  const { business } = await getCurrentContext();
  await dismiss(id, business.id);
  revalidate();
}
