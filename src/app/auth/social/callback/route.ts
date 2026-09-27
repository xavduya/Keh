/**
 * OAuth callback — Facebook & Instagram
 *
 * GET /auth/social/callback?code=...&state=...
 *
 * Meta redirects here after the user grants permissions. This handler:
 *   1. Verifies `state` against the nonce cookie set by the connect route
 *      (CSRF protection) and that the user is signed in.
 *   2. Exchanges the code for a long-lived user token.
 *   3. Lists the user's Pages (with their linked Instagram accounts).
 *   4. One eligible Page: saves it (encrypted Page token). Several: stores the
 *      user token, encrypted, in a short-lived cookie and sends the owner to
 *      /social-accounts/choose to pick one.
 *
 * Page tokens derived from a long-lived user token don't expire, so there's
 * no refresh job; if the owner revokes access, publishing fails and they
 * reconnect.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentContext } from "@/lib/auth/context";
import { getMetaCredentials } from "@/lib/env";
import type { ConnectErrorCode } from "@/lib/social/connect-errors";
import { exchangeCodeForToken, exchangeForLongLivedToken, getPages } from "@/lib/social/meta";
import {
  OAUTH_COOKIE,
  PAGE_PICK_COOKIE,
  PAGE_PICK_COOKIE_PATH,
  encodePagePick,
  verifyOAuthState,
} from "@/lib/social/oauth-state";
import { isTokenEncryptionConfigured } from "@/lib/social/token-crypto";
import { saveMetaPage } from "@/services/social-account.service";

const PAGE_PICK_MAX_AGE = 10 * 60; // seconds

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const redirectTo = (url: string) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/auth/social/callback" });
    return response;
  };
  const success = () => redirectTo(`${origin}/social-accounts?connected=1`);
  // Owner-facing messages live in CONNECT_ERRORS; Meta's raw details only go to the server log.
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

  if (!isTokenEncryptionConfigured()) return failure("not_configured");
  const { appId, appSecret } = getMetaCredentials();

  try {
    const shortLived = await exchangeCodeForToken(code, `${origin}/auth/social/callback`, appId, appSecret);
    const userToken = await exchangeForLongLivedToken(shortLived, appId, appSecret);

    const pages = await getPages(userToken);
    if (pages.length === 0) {
      return failure(state.platform === "FACEBOOK" ? "no_page_facebook" : "no_page_instagram");
    }
    const eligible = state.platform === "FACEBOOK" ? pages : pages.filter((p) => p.instagram_business_account);
    if (eligible.length === 0) return failure("no_instagram");

    if (eligible.length === 1) {
      await saveMetaPage(businessId, state.platform, eligible[0]);
      return success();
    }

    const response = redirectTo(`${origin}/social-accounts/choose`);
    response.cookies.set(PAGE_PICK_COOKIE, encodePagePick({ platform: state.platform, userToken }), {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: PAGE_PICK_COOKIE_PATH,
      maxAge: PAGE_PICK_MAX_AGE,
    });
    return response;
  } catch (err) {
    console.error("Meta OAuth callback failed", err);
    return failure("failed");
  }
}
