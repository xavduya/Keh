import { headers } from "next/headers";

/**
 * This site's origin for links in emails (confirm, reset password, change
 * email). Some browsers omit Origin on same-origin posts, so fall back to
 * the (forwarded) Host header. Server-only.
 */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** A same-site path to continue to after an auth callback, or the fallback. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  // Only plain absolute paths: no "//evil.com", no "/\evil.com", no schemes.
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}
