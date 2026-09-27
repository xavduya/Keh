/**
 * Meta Graph API — the calls Keh makes for Facebook Pages and Instagram
 * Business accounts (connect flow, publishing, insights). Server-only.
 *
 * Every function throws MetaApiError on a failed request; the message is
 * Meta's, for the server log — show owners a plain-language message instead.
 */

export const GRAPH_VERSION = "v22.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const TIMEOUT_MS = 15_000;

export class MetaApiError extends Error {
  constructor(
    message: string,
    /** Meta's error code, e.g. 190 = invalid/expired token. */
    readonly code?: number
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

/** A Graph request. `params` go in the query string (GET) or form body (POST). */
export async function graph<T>(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET"
): Promise<T> {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, "")}`);
  const init: RequestInit = { method, signal: AbortSignal.timeout(TIMEOUT_MS) };
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    init.body = new URLSearchParams(params);
  }

  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    const error = body?.error ?? {};
    throw new MetaApiError(`${path}: ${error.message ?? `HTTP ${res.status}`}`, error.code);
  }
  return body as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────────────────────────────────────

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string
): Promise<string> {
  const { access_token } = await graph<{ access_token: string }>("oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return access_token;
}

/** Long-lived user token (~60 days); Page tokens derived from it don't expire. */
export async function exchangeForLongLivedToken(shortLived: string, appId: string, appSecret: string): Promise<string> {
  const { access_token } = await graph<{ access_token: string }>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLived,
  });
  return access_token;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  /** The Instagram Business account linked to this Page, if any. */
  instagram_business_account?: { id: string; username: string };
}

/** Every Page the user manages, with its linked Instagram account. */
export async function getPages(userToken: string): Promise<MetaPage[]> {
  const { data } = await graph<{ data?: MetaPage[] }>("me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,instagram_business_account{id,username}",
    limit: "100",
  });
  return data ?? [];
}
