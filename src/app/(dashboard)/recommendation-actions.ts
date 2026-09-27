"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { buildMarketingContext } from "@/lib/ai/context";
import { consumeAiRequest } from "@/lib/ai/rate-limit";
import { generateRecommendations } from "@/lib/ai/recommendations";
import {
  dismissRecommendation as dismiss,
  getRecommendations,
  recommendationsAreStale,
  replaceRecommendations,
} from "@/services/recommendation.service";

export type RefreshResult = { updated: boolean; error?: string };

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/assistant");
}

/**
 * Generates this week's recommendations. Without `force`, only when the
 * current ones are missing or over a week old (called automatically by the
 * pages); with `force` ("New ideas"), always.
 */
export async function refreshRecommendations({ force = false } = {}): Promise<RefreshResult> {
  const { business } = await getCurrentContext();

  if (!force && !recommendationsAreStale(await getRecommendations(business.id))) {
    return { updated: false };
  }

  const limit = await consumeAiRequest();
  if (!limit.allowed) {
    return { updated: false, error: force ? limit.message : undefined };
  }

  try {
    const data = await buildMarketingContext(business);
    const recommendations = await generateRecommendations(data);
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
