/**
 * Analytics service
 *
 * Provides aggregated analytics data for the dashboard and analytics pages.
 * Currently backed by mock data. Replace with Supabase PostMetric queries in Phase 5.
 *
 * Architecture note:
 *   This service is responsible for CALCULATING structured findings from raw metrics.
 *   It does NOT generate human-readable text. That is the AI layer's responsibility.
 *
 *   Raw PostMetrics → Analytics Service → AnalyticsFindings → AI → Recommendation
 */

import type { AnalyticsSummary, AnalyticsFindings } from "@/data/mock-analytics";
import {
  mockAnalyticsSummary,
  mockAnalyticsFindings,
  mockWeeklyReach,
  mockInsights,
  mockAudienceLearnings,
  PLATFORM_REACH_RATIO,
} from "@/data/mock-analytics";

export async function getAnalyticsSummary(
  businessId: string
): Promise<AnalyticsSummary> {
  void businessId; // will be used in Phase 5
  return mockAnalyticsSummary;
}

export async function getAnalyticsFindings(
  businessId: string
): Promise<AnalyticsFindings> {
  void businessId;
  return mockAnalyticsFindings;
}

export async function getWeeklyReach(businessId: string) {
  void businessId;
  return mockWeeklyReach;
}

export async function getInsights(businessId: string) {
  void businessId;
  return mockInsights;
}

export async function getAudienceLearnings(businessId: string) {
  void businessId;
  return mockAudienceLearnings;
}

export function getPlatformReachRatio(platform: string): number {
  return PLATFORM_REACH_RATIO[platform] ?? 1;
}
