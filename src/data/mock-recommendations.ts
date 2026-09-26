/**
 * Mock AI recommendations data
 *
 * Extracted from the hardcoded recommendation content inside the prototype's
 * home(), assistant(), and why() render functions.
 *
 * In Phase 6 these will come from the AI service layer, structured as
 * AIRecommendation objects and stored in Supabase.
 */

import type { AIRecommendation } from "@/types";

export const mockRecommendations: AIRecommendation[] = [
  {
    id: "rec_001",
    businessId: "biz_001",
    type: "PRODUCT_SPOTLIGHT",
    title: "Give your Matcha Latte a little more spotlight.",
    explanation:
      "Your last two Matcha posts received 38% more engagement than your usual product posts. Let's keep the momentum going.",
    confidence: 0.82,
    source: "HISTORICAL_PERFORMANCE",
    actionLabel: "Create Recommended Campaign",
    actionGoal: "PROMOTE_PRODUCT",
    createdAt: "2026-09-26T00:00:00.000Z",
  },
  {
    id: "rec_002",
    businessId: "biz_001",
    type: "CONTENT_FORMAT",
    title: "Take them behind the counter.",
    explanation:
      "Behind-the-scenes content is generating more comments than promotional graphics. Show the care that goes into every cup.",
    confidence: 0.74,
    source: "HISTORICAL_PERFORMANCE",
    actionLabel: "Create one",
    actionGoal: "KEEP_PAGE_ACTIVE",
    createdAt: "2026-09-26T00:00:00.000Z",
  },
  {
    id: "rec_003",
    businessId: "biz_001",
    type: "CAPTION_STYLE",
    title: "Let your prices do the talking.",
    explanation:
      "Posts displaying prices received 21% more interactions in the sample campaign comparison. A clear price makes ordering a little easier.",
    confidence: 0.71,
    source: "HISTORICAL_PERFORMANCE",
    createdAt: "2026-09-26T00:00:00.000Z",
  },
  {
    id: "rec_004",
    businessId: "biz_001",
    type: "POSTING_TIME",
    title: "Friday evening is your sweet spot.",
    explanation:
      "Friday, 5–7 PM had the strongest engagement in your recent post history. Schedule your next campaign to land in that window.",
    confidence: 0.68,
    source: "HISTORICAL_PERFORMANCE",
    createdAt: "2026-09-26T00:00:00.000Z",
  },
];
