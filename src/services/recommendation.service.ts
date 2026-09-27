/**
 * Recommendation service
 *
 * Provides AI recommendations for the dashboard and assistant pages.
 * Currently backed by mock data. In Phase 6, this will call the AI service
 * with analytics findings from analytics.service.ts.
 */

import type { AIRecommendation } from "@/types";
import { mockRecommendations } from "@/data/mock-recommendations";

export async function getRecommendations(
  businessId: string
): Promise<AIRecommendation[]> {
  return mockRecommendations.filter(
    (recommendation) => recommendation.businessId === businessId
  );
}

export async function getTopRecommendation(
  businessId: string
): Promise<AIRecommendation | null> {
  const all = await getRecommendations(businessId);
  return all[0] ?? null;
}
