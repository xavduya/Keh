/**
 * Business service
 *
 * Provides data-access functions for the current business, its brand profile,
 * and subscription. Currently backed by mock data.
 * Replace implementations with Supabase queries in Phase 5 — signatures will not change.
 */

import type { Business, BrandProfile, Subscription } from "@/types";
import {
  mockBusiness,
  mockBrandProfile,
  mockSubscription,
} from "@/data/mock-business";

// ─────────────────────────────────────────────────────────────────────────────
// Business
// ─────────────────────────────────────────────────────────────────────────────

export async function getBusiness(businessId: string): Promise<Business | null> {
  void businessId; // will be used in Phase 5
  return mockBusiness;
}

export async function getBusinessByOwnerId(
  ownerId: string
): Promise<Business | null> {
  void ownerId;
  return mockBusiness;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand profile
// ─────────────────────────────────────────────────────────────────────────────

export async function getBrandProfile(
  businessId: string
): Promise<BrandProfile | null> {
  void businessId;
  return mockBrandProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubscription(
  businessId: string
): Promise<Subscription | null> {
  void businessId;
  return mockSubscription;
}
