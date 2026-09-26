/**
 * Mock social accounts data
 *
 * Extracted from the prototype's state.connected array.
 * Replace with a Supabase query in Phase 5.
 */

import type { SocialAccount } from "@/types";

export const mockSocialAccounts: SocialAccount[] = [
  {
    id: "acct_001",
    businessId: "biz_001",
    platform: "FACEBOOK",
    accountName: "Juan's Café",
    connected: true,
    requiresManualPublish: false,
    lastSyncedAt: "2026-09-26T00:00:00.000Z",
  },
  {
    id: "acct_002",
    businessId: "biz_001",
    platform: "INSTAGRAM",
    accountName: "@juanscafe",
    connected: true,
    requiresManualPublish: false,
    lastSyncedAt: "2026-09-26T00:00:00.000Z",
  },
  {
    id: "acct_003",
    businessId: "biz_001",
    platform: "TIKTOK",
    accountName: "@juanscafe",
    connected: true,
    requiresManualPublish: true,
    lastSyncedAt: "2026-09-26T00:00:00.000Z",
  },
];
