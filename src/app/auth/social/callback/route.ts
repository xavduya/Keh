/**
 * OAuth callback — Facebook & Instagram
 *
 * GET /auth/social/callback?code=...&state=...
 *
 * Meta redirects here after the user grants permissions. This handler:
 *   1. Verifies `state` against the nonce cookie set by the connect route
 *      (CSRF protection) and that the user is signed in.
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
import { OAUTH_COOKIE, verifyOAuthState } from "@/lib/social/oauth-state";
import type { ConnectErrorCode } from "@/lib/social/connect-errors";

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

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
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

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
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

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
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

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const body: { instagram_business_account?: IGAccountResult } = await res.json();
  return body.instagram_business_account ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

// Owner-facing messages live in CONNECT_ERRORS; Meta's raw error details only go to the server log.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const redirectTo = (url: string) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/auth/social/callback" });
    return response;
  };
  const success = () => redirectTo(`${origin}/social-accounts?connected=1`);
  const failure = (code: ConnectErrorCode) => redirectTo(`${origin}/social-accounts?error=${code}`);

  if (searchParams.get("error")) {
    console.warn("Meta OAuth returned an error:", searchParams.get("error_description") ?? searchParams.get("error"));
    return failure("cancelled");
  }

  // CSRF: the state must carry the nonce this browser was given.
  const state = verifyOAuthState(searchParams.get("state"), request.cookies.get(OAUTH_COOKIE)?.value);
  const code = searchParams.get("code");
  if (!state || !code) return failure("expired");

  // Must be signed in; the account is saved to *their* business.
  let businessId: string;
  try {
    businessId = (await getCurrentContext()).business.id;
  } catch {
    return redirectTo(`${origin}/login`);
  }

  const { appId, appSecret } = getMetaCredentials();
  const redirectUri = `${origin}/auth/social/callback`;

  try {
    // 1. Exchange code for short-lived token
    const { access_token: shortLived } = await exchangeCodeForToken(code, redirectUri, appId, appSecret);

    // 2. Upgrade to long-lived token (~60 days)
    // Only used to fetch the Page; the Page token saved below doesn't expire.
    const { access_token: longLived } = await exchangeForLongLivedToken(shortLived, appId, appSecret);

    // 3. The managed Page (Instagram Business accounts hang off a Page too)
    const page = await getFirstPage(longLived);
    if (!page) {
      return failure(state.platform === "FACEBOOK" ? "no_page_facebook" : "no_page_instagram");
    }

    if (state.platform === "FACEBOOK") {
      await upsertSocialAccount(businessId, {
        platform: "FACEBOOK",
        accountId: page.id,
        accountName: page.name,
        // A Page token derived from a long-lived user token doesn't expire.
        accessToken: page.access_token,
      });
    } else {
      const igAccount = await getLinkedInstagramAccount(page.id, page.access_token);
      if (!igAccount) {
        return failure("no_instagram");
      }
      await upsertSocialAccount(businessId, {
        platform: "INSTAGRAM",
        accountId: igAccount.id,
        accountName: `@${igAccount.username}`,
        accessToken: page.access_token, // page token is used for IG Content Publishing API
      });
    }

    return success();
  } catch (err) {
    console.error("Meta OAuth callback failed", err);
    return failure("failed");
  }
}
