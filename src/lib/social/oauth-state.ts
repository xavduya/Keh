/**
 * OAuth `state` for the Meta connect flow (CSRF protection).
 *
 * The connect route creates a random nonce, stores it in a short-lived
 * httpOnly cookie, and sends it to Meta inside `state` (with the platform).
 * The callback only accepts a login whose `state` nonce matches the cookie —
 * so nobody can send an owner a link that attaches *their* Page to the
 * owner's business.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Platform } from "@/types";

export const OAUTH_COOKIE = "keh_social_oauth";
export const OAUTH_COOKIE_MAX_AGE = 10 * 60; // seconds

export interface OAuthState {
  nonce: string;
  platform: Extract<Platform, "FACEBOOK" | "INSTAGRAM">;
}

export function createOAuthState(platform: OAuthState["platform"]): { state: string; nonce: string } {
  const nonce = randomBytes(24).toString("base64url");
  return { nonce, state: Buffer.from(JSON.stringify({ nonce, platform })).toString("base64url") };
}

/** Parses `state` and checks its nonce against the cookie. Null if invalid. */
export function verifyOAuthState(state: string | null, cookieNonce: string | undefined): OAuthState | null {
  if (!state || !cookieNonce) return null;
  let parsed: Partial<OAuthState>;
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (typeof parsed.nonce !== "string" || (parsed.platform !== "FACEBOOK" && parsed.platform !== "INSTAGRAM")) {
    return null;
  }
  const a = Buffer.from(parsed.nonce);
  const b = Buffer.from(cookieNonce);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { nonce: parsed.nonce, platform: parsed.platform };
}
