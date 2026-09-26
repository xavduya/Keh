/**
 * Mock business data
 *
 * Extracted from the prototype's state.business object.
 * Replace with a Supabase query in Phase 5.
 */

import type { Business, BrandProfile, Subscription } from "@/types";

export const mockBusiness: Business = {
  id: "biz_001",
  ownerId: "user_001",
  name: "Juan's Café",
  description: "Your neighborhood café for good coffee and great conversations.",
  industry: "Café & restaurant",
  location: "Cebu City",
  targetAudience: "College students and young professionals",
  preferredLanguage: "TAGLISH",
  phone: "+63 917 000 1234",
  website: "",
  operatingHours: "8:00 AM – 9:00 PM",
  delivery: "Pickup, GrabFood",
  payment: "Cash, GCash",
  audienceAgeGroup: "18–35",
  audienceInterests: "Coffee, studying, local food",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export const mockBrandProfile: BrandProfile = {
  businessId: "biz_001",
  tone: "FRIENDLY",
  preferredLanguage: "TAGLISH",
  brandColors: ["#5849da"],
  defaultCTA: "MESSAGE_US",
  brandGuidelines: "",
};

export const mockSubscription: Subscription = {
  id: "sub_001",
  businessId: "biz_001",
  plan: "STARTER",
  pricePerMonth: 399,
  currency: "PHP",
  renewsAt: "2026-10-01T00:00:00.000Z",
  usage: {
    aiCampaignsUsed: 32,
    aiCampaignsLimit: 50,
    scheduledPostsUsed: 41,
    scheduledPostsLimit: 60,
    resetsAt: "2026-10-01T00:00:00.000Z",
  },
};
