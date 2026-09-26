/**
 * Mock analytics data
 *
 * Extracted from hardcoded values inside the prototype's metrics() and
 * analytics() render functions. These will be replaced by PostMetric
 * queries aggregated in analytics.service.ts in Phase 5.
 *
 * The structure intentionally separates raw metrics from derived "insights"
 * to match the future analytics pipeline:
 *   Raw metrics → Analytics Service → Structured Findings → AI interpretation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Top-level summary metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  period: string;
  totalReach: number;
  totalInteractions: number;
  totalLinkClicks: number;
  followerCount: number;
  reachGrowthPct: number;
  interactionsGrowthPct: number;
}

export const mockAnalyticsSummary: AnalyticsSummary = {
  period: "September 2026",
  totalReach: 24821,
  totalInteractions: 3240,
  totalLinkClicks: 812,
  followerCount: 1486,
  reachGrowthPct: 18,
  interactionsGrowthPct: 12,
};

// ─────────────────────────────────────────────────────────────────────────────
// Platform breakdown ratios
// Used to approximate per-platform metrics from total values.
// Will be replaced by actual per-platform PostMetric aggregation.
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_REACH_RATIO: Record<string, number> = {
  FACEBOOK: 0.58,
  INSTAGRAM: 0.32,
  TIKTOK: 0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Weekly reach series  (used by the analytics bar chart)
// ─────────────────────────────────────────────────────────────────────────────

export interface WeeklyReachPoint {
  /** Label shown on chart x-axis */
  label: string;
  reach: number;
}

export const mockWeeklyReach: WeeklyReachPoint[] = [
  { label: "Sep 1",  reach: 3200 },
  { label: "Sep 4",  reach: 4100 },
  { label: "Sep 7",  reach: 3600 },
  { label: "Sep 10", reach: 4900 },
  { label: "Sep 13", reach: 5300 },
  { label: "Sep 16", reach: 6400 },
  { label: "Sep 19", reach: 5900 },
  { label: "Sep 22", reach: 7200 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Structured findings  (output of the Analytics Service)
// These are what the AI layer will eventually interpret into recommendations.
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsFindings {
  videoReachLiftPct: number;
  priceShownEngagementLiftPct: number;
  bestPostingWindow: string;
  bestProduct: string;
  bestPlatform: string;
}

export const mockAnalyticsFindings: AnalyticsFindings = {
  videoReachLiftPct: 34,
  priceShownEngagementLiftPct: 19,
  bestPostingWindow: "Friday 17:00–19:00",
  bestProduct: "Matcha Latte",
  bestPlatform: "Facebook",
};

// ─────────────────────────────────────────────────────────────────────────────
// Human-readable insight strings  (will come from AI interpretation later)
// ─────────────────────────────────────────────────────────────────────────────

export const mockInsights: string[] = [
  "Short videos generated 34% more reach.",
  "Posts displaying prices received 19% more interactions.",
  "Friday evening was your strongest posting period.",
  "Matcha Latte was your highest-performing product.",
];

export const mockAudienceLearnings: string[] = [
  "Short videos get more attention than static graphics.",
  "Taglish captions invite more conversation.",
  "Your audience is most active between 5 PM and 7 PM.",
  "Clear prices help people decide.",
  "Facebook currently brings you more interactions than Instagram.",
];
