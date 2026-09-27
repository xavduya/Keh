/**
 * Social account service
 *
 * Provides data-access functions for connected social accounts.
 * Currently backed by mock data. Replace with Supabase queries in Phase 5.
 */

import type { SocialAccount } from "@/types";
import { mockSocialAccounts } from "@/data/mock-social-accounts";

export async function getSocialAccounts(
  businessId: string
): Promise<SocialAccount[]> {
  void businessId; // will be used in Phase 5
  return mockSocialAccounts;
}

export async function getConnectedAccounts(
  businessId: string
): Promise<SocialAccount[]> {
  const all = await getSocialAccounts(businessId);
  return all.filter((a) => a.connected);
}

export async function getSocialAccountByPlatform(
  businessId: string,
  platform: SocialAccount["platform"]
): Promise<SocialAccount | null> {
  const all = await getSocialAccounts(businessId);
  return all.find((a) => a.platform === platform) ?? null;
}
