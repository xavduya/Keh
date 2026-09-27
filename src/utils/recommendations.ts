/**
 * Display helpers for stored recommendations (Home card, assistant sidebar).
 */

import type { AIRecommendation, Product, RecommendationSource } from "@/types";
import type { RecommendationCardData } from "@/components/dashboard/RecommendationCard";

const SOURCE_TEXT: Record<RecommendationSource, string> = {
  HISTORICAL_PERFORMANCE: "the results of your published posts",
  BUSINESS_PROFILE: "your business profile and products",
  GENERAL_BEST_PRACTICE: "what tends to work for local businesses",
  AUDIENCE_DATA: "what we know about your audience",
};

/** Wizard link that pre-selects the recommendation's product, goal and offer. */
export function recommendationHref(rec: AIRecommendation): string {
  const params = new URLSearchParams();
  if (rec.productId) params.set("product", rec.productId);
  if (rec.actionGoal) params.set("goal", rec.actionGoal);
  if (rec.promotion) params.set("promotion", rec.promotion);
  const query = params.toString();
  return query ? `/campaigns/new?${query}` : "/campaigns/new";
}

export function toCardData(rec: AIRecommendation, products: Product[]): RecommendationCardData {
  const product = products.find((p) => p.id === rec.productId);
  return {
    id: rec.id,
    title: rec.title,
    body: rec.explanation,
    chips: rec.chips,
    cta: rec.actionLabel || "Create campaign",
    href: recommendationHref(rec),
    imageUrl: product?.imageUrl || undefined,
    why: `${rec.generatedBy === "ai" ? "Keh AI wrote this" : "Keh put this together"} from ${SOURCE_TEXT[rec.source]}. Recommendations refresh every week — or tap "New ideas" any time.`,
    basis: rec.generatedBy === "ai" ? "Written by Keh AI for your business" : `Based on ${SOURCE_TEXT[rec.source]}`,
    generatedByAi: rec.generatedBy === "ai",
  };
}
