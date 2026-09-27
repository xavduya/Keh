/**
 * OAuth initiation — Facebook & Instagram
 *
 * GET /api/social/connect/facebook
 * GET /api/social/connect/instagram
 *
 * Builds the Meta OAuth authorization URL and redirects the user to it.
 * Meta uses a single OAuth app for both Facebook Pages and Instagram;
 * the `platform` in `state` tells the callback which account type to save.
 *
 * `state` also carries a random nonce that is stored in a short-lived
 * httpOnly cookie; the callback rejects any login whose nonce doesn't match
 * (CSRF protection — see lib/social/oauth-state.ts).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentContext } from "@/lib/auth/context";
import { getMetaCredentials, isMetaConfigured } from "@/lib/env";
import { OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE, createOAuthState } from "@/lib/social/oauth-state";
import { isTokenEncryptionConfigured } from "@/lib/social/token-crypto";

const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
].join(",");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const origin = new URL(request.url).origin;

  if (platform !== "facebook" && platform !== "instagram") {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  // Must be signed in (redirects to /login otherwise).
  await getCurrentContext();

  if (!isMetaConfigured() || !isTokenEncryptionConfigured()) {
    return NextResponse.redirect(`${origin}/social-accounts?error=not_configured`);
  }
  const { appId } = getMetaCredentials();

  const { state, nonce } = createOAuthState(platform === "facebook" ? "FACEBOOK" : "INSTAGRAM");

  const url = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", `${origin}/auth/social/callback`);
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(url.toString());
  response.cookies.set(OAUTH_COOKIE, nonce, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax", // sent on Meta's top-level redirect back to us
    path: "/auth/social/callback",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return response;
}
