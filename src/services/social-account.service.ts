/**
 * Social account service
 *
 * Connected Facebook / Instagram / TikTok accounts, backed by the
 * social_accounts table.
 *
 * Migration 007 hides the OAuth token columns from signed-in users (column
 * grants), so reads select an explicit list of safe columns — `select("*")`
 * fails with 42501 — and anything that writes or clears tokens runs
 * server-side with the secret key.
 */

import type { Platform, SocialAccount } from "@/types";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";

/** Columns owners are allowed to read (no tokens). */
const SAFE_COLUMNS =
  "id, business_id, platform, account_name, account_id, connected, requires_manual_publish, last_synced_at";

/** Platforms Keh supports, in display order. */
export const SOCIAL_PLATFORMS: Platform[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];

/** TikTok has no publishing API for us: Keh prepares, the owner posts. */
const MANUAL_PUBLISH: Record<Platform, boolean> = { FACEBOOK: false, INSTAGRAM: false, TIKTOK: true };

type SafeRow = {
  id: string;
  business_id: string;
  platform: Platform;
  account_name: string;
  account_id: string | null;
  connected: boolean;
  requires_manual_publish: boolean;
  last_synced_at: string | null;
};

function toSocialAccount(row: SafeRow): SocialAccount {
  return {
    id: row.id,
    businessId: row.business_id,
    platform: row.platform,
    accountName: row.account_name,
    accountId: row.account_id ?? undefined,
    connected: row.connected,
    requiresManualPublish: row.requires_manual_publish,
    lastSyncedAt: row.last_synced_at ?? undefined,
  };
}

/** One entry per supported platform — a disconnected placeholder when there's no row yet. */
export async function getSocialAccounts(businessId: string): Promise<SocialAccount[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select(SAFE_COLUMNS)
    .eq("business_id", businessId);
  if (error) throw error;

  const rows = (data as unknown as SafeRow[]).map(toSocialAccount);
  return SOCIAL_PLATFORMS.map(
    (platform) =>
      rows.find((a) => a.platform === platform) ?? {
        id: `new-${platform.toLowerCase()}`,
        businessId,
        platform,
        accountName: "",
        connected: false,
        requiresManualPublish: MANUAL_PUBLISH[platform],
      }
  );
}

export async function getConnectedAccounts(businessId: string): Promise<SocialAccount[]> {
  return (await getSocialAccounts(businessId)).filter((a) => a.connected);
}

export async function getSocialAccountByPlatform(
  businessId: string,
  platform: Platform
): Promise<SocialAccount | null> {
  return (await getSocialAccounts(businessId)).find((a) => a.platform === platform) ?? null;
}

export interface SocialAccountConnection {
  platform: Platform;
  accountId?: string;
  accountName: string;
  /** Omit for platforms without API access (TikTok manual posting). */
  accessToken?: string;
  tokenExpiresAt?: string;
}

/**
 * Saves a connected account (one per platform per business), including its
 * token. Server-only: uses the secret key because owners can't write token
 * columns. The caller must have verified the business belongs to the user.
 */
export async function upsertSocialAccount(
  businessId: string,
  connection: SocialAccountConnection
): Promise<void> {
  const { error } = await createAdminClient()
    .from("social_accounts")
    .upsert(
      {
        business_id: businessId,
        platform: connection.platform,
        account_name: connection.accountName,
        account_id: connection.accountId ?? null,
        connected: true,
        requires_manual_publish: MANUAL_PUBLISH[connection.platform],
        access_token: connection.accessToken ?? null,
        refresh_token: null,
        token_expires_at: connection.tokenExpiresAt ?? null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "business_id,platform" }
    );
  if (error) throw error;
}

/**
 * Disconnects a platform and deletes its stored token. Server-only (secret
 * key) because clearing token columns isn't allowed for owners.
 */
export async function disconnectSocialAccount(businessId: string, platform: Platform): Promise<void> {
  const { error } = await createAdminClient()
    .from("social_accounts")
    .update({
      connected: false,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    })
    .eq("business_id", businessId)
    .eq("platform", platform);
  if (error) throw error;
}
