/**
 * OAuth callback — Facebook & Instagram
 *
 * GET /auth/social/callback?code=...&state=...
 *
 * Meta redirects here after the user grants permissions. This handler:
 *   1. Verifies the state matches the current session's business.
 *   2. Exchanges the short-lived code for a long-lived user access token.
 *   3. For Facebook: fetches the user's Pages list and picks the first Page.
 *   4. For Instagram: fetches the Instagram Business Account linked to the Page.
 *   5. Writes (or updates) the social_accounts row via upsertSocialAccount.
 *   6. Redirects to /social-accounts on success, or back with an error param.
 *
 * Long-lived tokens last ~60 days. Token rotation is not yet implemented
 * (add a cron job that calls /oauth/access_token with grant_type=fb_exchange_token
 * before the token expires).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentContext } from "@/lib/auth/context";
import { getMetaCredentials } from "@/lib/env";
import { upsertSocialAccount } from "@/services/social-account.service";
import type { Platform } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Meta Graph API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in?: number }> {
  const url = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${body}`);
  }
  return res.json();
}

async function exchangeForLongLivedToken(
  shortLived: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLived);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Long-lived token exchange failed: ${body}`);
  }
  return res.json();
}

interface PageResult {
  id: string;
  name: string;
  access_token: string;
}

/** Returns the first Page the user manages. */
async function getFirstPage(userToken: string): Promise<PageResult | null> {
  const url = new URL("https://graph.facebook.com/v22.0/me/accounts");
  url.searchParams.set("access_token", userToken);
  url.searchParams.set("fields", "id,name,access_token");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const body: { data?: PageResult[] } = await res.json();
  return body.data?.[0] ?? null;
}

interface IGAccountResult {
  id: string;
  username: string;
}

/** Returns the Instagram Business Account linked to a given Facebook Page. */
async function getLinkedInstagramAccount(
  pageId: string,
  pageToken: string
): Promise<IGAccountResult | null> {
  const url = new URL(`https://graph.facebook.com/v22.0/${pageId}`);
  url.searchParams.set("fields", "instagram_business_account{id,username}");
  url.searchParams.set("access_token", pageToken);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const body: { instagram_business_account?: IGAccountResult } = await res.json();
  return body.instagram_business_account ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const successUrl = `${origin}/social-accounts`;
  const errorUrl = (msg: string) =>
    `${origin}/social-accounts?error=${encodeURIComponent(msg)}`;

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const metaError = searchParams.get("error_description") ?? searchParams.get("error");

  if (metaError) {
    return NextResponse.redirect(errorUrl(metaError));
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(errorUrl("Missing code or state"));
  }

  // Decode and validate state
  let state: { businessId: string; platform: Platform };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"));
  } catch {
    return NextResponse.redirect(errorUrl("Invalid state"));
  }

  // Verify the session business matches the state
  let businessId: string;
  try {
    const ctx = await getCurrentContext();
    businessId = ctx.business.id;
  } catch {
    return NextResponse.redirect(`${origin}/login`);
  }

  if (state.businessId !== businessId) {
    return NextResponse.redirect(errorUrl("Business mismatch"));
  }

  const { appId, appSecret } = getMetaCredentials();
  const redirectUri = `${origin}/auth/social/callback`;

  try {
    // 1. Exchange code for short-lived token
    const { access_token: shortLived } = await exchangeCodeForToken(
      code,
      redirectUri,
      appId,
      appSecret
    );

    // 2. Upgrade to long-lived token (~60 days)
    const { access_token: longLived, expires_in } =
      await exchangeForLongLivedToken(shortLived, appId, appSecret);

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : undefined;

    if (state.platform === "FACEBOOK") {
      // 3a. Get the managed Page
      const page = await getFirstPage(longLived);
      if (!page) {
        return NextResponse.redirect(
          errorUrl("No Facebook Page found. Make sure you manage at least one Page.")
        );
      }

      await upsertSocialAccount(businessId, {
        platform: "FACEBOOK",
        accountId: page.id,
        accountName: page.name,
        accessToken: page.access_token, // page token, doesn't expire
        tokenExpiresAt,
      });
    } else if (state.platform === "INSTAGRAM") {
      // 3b. Get the Page first, then the linked Instagram account
      const page = await getFirstPage(longLived);
      if (!page) {
        return NextResponse.redirect(
          errorUrl("No Facebook Page found. Instagram Business requires a linked Page.")
        );
      }

      const igAccount = await getLinkedInstagramAccount(page.id, page.access_token);
      if (!igAccount) {
        return NextResponse.redirect(
          errorUrl(
            "No Instagram Business account linked to your Page. " +
            "Go to your Facebook Page Settings → Instagram to link it."
          )
        );
      }

      await upsertSocialAccount(businessId, {
        platform: "INSTAGRAM",
        accountId: igAccount.id,
        accountName: `@${igAccount.username}`,
        accessToken: page.access_token, // page token is used for IG Content Publishing API
        tokenExpiresAt,
      });
    }

    return NextResponse.redirect(successUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(errorUrl(message));
  }
}
