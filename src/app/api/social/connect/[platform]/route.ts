/**
 * OAuth initiation — Facebook & Instagram
 *
 * GET /api/social/connect/facebook
 * GET /api/social/connect/instagram
 *
 * Builds the Meta OAuth authorization URL and redirects the user to it.
 * Meta uses a single OAuth app for both Facebook Pages and Instagram;
 * the `platform` segment tells the callback which account type to save.
 *
 * The `state` parameter is a Base64-encoded JSON object carrying the
 * businessId and the platform so the callback can write the right row.
 * It is not a security token on its own — the session cookie is the
 * source of truth; state is only used to route the callback correctly.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentContext } from "@/lib/auth/context";
import { getMetaCredentials, publicEnv } from "@/lib/env";

const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (platform !== "facebook" && platform !== "instagram") {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const { business } = await getCurrentContext();
  const { appId } = getMetaCredentials();

  const state = Buffer.from(
    JSON.stringify({ businessId: business.id, platform: platform.toUpperCase() })
  ).toString("base64url");

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/auth/social/callback`;

  const url = new URL("https://www.facebook.com/v22.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}
