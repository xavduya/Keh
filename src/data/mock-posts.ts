/**
 * Mock campaigns and posts data
 *
 * Extracted from the prototype's state.posts array.
 *
 * In the prototype, posts had a flat structure mixing campaign-level
 * fields (goal, promotion) with post-level fields (platform, caption, status).
 * Here they are properly separated into Campaign and SocialPost entities,
 * matching the target domain model.
 *
 * Replace with Supabase queries in Phase 5.
 */

import type { Campaign, SocialPost, EnrichedPost } from "@/types";
import { mockProducts } from "./mock-products";

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────────────────────

export const mockCampaigns: Campaign[] = [
  {
    id: "camp_001",
    businessId: "biz_001",
    productId: "prod_002",
    goal: "PROMOTION",
    promotion: "15% off",
    duration: "Friday – Sunday",
    instructions: "Target college students.",
    status: "PUBLISHED",
    createdAt: "2026-09-20T00:00:00.000Z",
  },
  {
    id: "camp_002",
    businessId: "biz_001",
    productId: "prod_002",
    goal: "PROMOTE_PRODUCT",
    promotion: "",
    duration: "",
    instructions: "",
    status: "SCHEDULED",
    createdAt: "2026-09-22T00:00:00.000Z",
  },
  {
    id: "camp_003",
    businessId: "biz_001",
    productId: "prod_001",
    goal: "KEEP_PAGE_ACTIVE",
    promotion: "",
    duration: "",
    instructions: "",
    status: "ACTION_REQUIRED",
    createdAt: "2026-09-23T00:00:00.000Z",
  },
  {
    id: "camp_004",
    businessId: "biz_001",
    productId: "prod_001",
    goal: "PROMOTE_PRODUCT",
    promotion: "",
    duration: "",
    instructions: "Friday evening push.",
    status: "PUBLISHED",
    createdAt: "2026-09-18T00:00:00.000Z",
  },
  {
    id: "camp_005",
    businessId: "biz_001",
    productId: "prod_002",
    goal: "PROMOTE_PRODUCT",
    promotion: "",
    duration: "",
    instructions: "",
    status: "DRAFT",
    createdAt: "2026-09-24T00:00:00.000Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Social Posts
// ─────────────────────────────────────────────────────────────────────────────

export const mockPosts: SocialPost[] = [
  // camp_001 — Spanish Latte Promotion (Published)
  {
    id: "post_001",
    campaignId: "camp_001",
    productId: "prod_002",
    platform: "FACEBOOK",
    title: "Spanish Latte Promotion",
    caption:
      "Study break? Deserve mo 'to! Treat yourself to our Spanish Latte for ₱140. 15% off Friday – Sunday!\n\nEspresso, milk, and a little sweetness.\nFind us at Juan's Café, Cebu City. Message Us and make your day a little sweeter.",
    scheduledAt: "2026-09-26T02:00:00.000Z",
    publishedAt: "2026-09-26T02:00:00.000Z",
    status: "PUBLISHED",
  },
  {
    id: "post_002",
    campaignId: "camp_001",
    productId: "prod_002",
    platform: "INSTAGRAM",
    title: "Spanish Latte Promotion",
    caption:
      "Your daily dose of good vibes ☕✨\nSpanish Latte · ₱140 · 15% off Friday – Sunday!\n📍 Juan's Café, Cebu City\nMessage Us 💜\n#CebuCafe #SupportLocal #CafeBreak",
    scheduledAt: "2026-09-26T02:00:00.000Z",
    publishedAt: "2026-09-26T02:00:00.000Z",
    status: "PUBLISHED",
  },

  // camp_002 — Weekend Bundle (Scheduled)
  {
    id: "post_003",
    campaignId: "camp_002",
    productId: "prod_002",
    platform: "FACEBOOK",
    title: "Weekend Bundle",
    caption:
      "Your weekend starts here. Spanish Latte, ₱140.\n📍 Juan's Café, Cebu City. Message Us!",
    scheduledAt: "2026-09-26T10:00:00.000Z",
    status: "SCHEDULED",
  },
  {
    id: "post_004",
    campaignId: "camp_002",
    productId: "prod_002",
    platform: "INSTAGRAM",
    title: "Weekend Bundle",
    caption:
      "Weekend vibes ☕\nSpanish Latte · ₱140\n📍 Juan's Café, Cebu City\n#CebuCafe #Weekend",
    scheduledAt: "2026-09-26T10:00:00.000Z",
    status: "SCHEDULED",
  },

  // camp_003 — Behind the Scenes (Action Required — TikTok)
  {
    id: "post_005",
    campaignId: "camp_003",
    productId: "prod_001",
    platform: "TIKTOK",
    title: "Behind the Scenes",
    caption:
      "POV: you found your new favorite study drink 👀\nMatcha Latte for ₱150.\n📍 Juan's Café, Cebu City\n#CebuCafe #StudyBreak #SupportLocal",
    scheduledAt: "2026-09-27T09:00:00.000Z",
    status: "ACTION_REQUIRED",
  },

  // camp_004 — Matcha Friday (Published, high reach)
  {
    id: "post_006",
    campaignId: "camp_004",
    productId: "prod_001",
    platform: "FACEBOOK",
    title: "Matcha Friday",
    caption:
      "Study break? Deserve mo 'to! Treat yourself to our Matcha Latte for ₱150.\n\nCreamy Japanese matcha with fresh milk, served over ice.\nFind us at Juan's Café, Cebu City. Message Us and make your day a little sweeter.",
    scheduledAt: "2026-09-25T10:00:00.000Z",
    publishedAt: "2026-09-25T10:00:00.000Z",
    status: "PUBLISHED",
  },
  {
    id: "post_007",
    campaignId: "camp_004",
    productId: "prod_001",
    platform: "INSTAGRAM",
    title: "Matcha Friday",
    caption:
      "Your daily dose of good vibes ☕✨\nMatcha Latte · ₱150\n📍 Juan's Café, Cebu City\nMessage Us 💜\n#CebuCafe #Matcha #SupportLocal",
    scheduledAt: "2026-09-25T10:00:00.000Z",
    publishedAt: "2026-09-25T10:00:00.000Z",
    status: "PUBLISHED",
  },

  // camp_005 — Midweek Coffee Break (Draft)
  {
    id: "post_008",
    campaignId: "camp_005",
    productId: "prod_002",
    platform: "INSTAGRAM",
    title: "Your Midweek Coffee Break",
    caption:
      "Your daily dose of good vibes ☕✨\nSpanish Latte · ₱140\n📍 Juan's Café, Cebu City\nMessage Us 💜\n#CebuCafe #MidweekBreak",
    scheduledAt: "2026-09-30T04:00:00.000Z",
    status: "DRAFT",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reach data  (separate — will come from PostMetric in Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

/** Sample reach values keyed by post ID, matching prototype's reach field. */
export const mockPostReach: Record<string, number> = {
  post_001: 4200,
  post_002: 0,    // prototype had reach on the combined post; split here
  post_006: 8640,
  post_007: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Enriched posts  (convenience — denormalized for UI consumption)
// ─────────────────────────────────────────────────────────────────────────────

function productById(id: string) {
  return mockProducts.find((p) => p.id === id) ?? mockProducts[0];
}

export const mockEnrichedPosts: EnrichedPost[] = mockPosts.map((post) => ({
  ...post,
  product: productById(post.productId),
  reach: mockPostReach[post.id] ?? 0,
  platforms: [post.platform],
}));
