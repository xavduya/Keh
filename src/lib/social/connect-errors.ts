/**
 * Errors from the Facebook / Instagram connect flow. The routes redirect to
 * /social-accounts?error=<code> and the page shows the matching message, so
 * a crafted link can't put arbitrary text on the page.
 */

export const CONNECT_ERRORS = {
  not_configured:
    "Facebook and Instagram connections aren't set up yet (missing Meta app credentials or SOCIAL_TOKEN_KEY).",
  cancelled: "The connection was cancelled on Facebook.",
  expired: "That connection link expired or didn't come from this browser. Please try connecting again.",
  failed: "We couldn't finish connecting. Please try again.",
  no_page_facebook: "No Facebook Page found. Make sure you manage at least one Page.",
  no_page_instagram: "No Facebook Page found. Instagram Business accounts need a linked Facebook Page.",
  no_instagram:
    "No Instagram Business account is linked to your Page. Go to your Facebook Page Settings → Instagram to link it.",
} as const;

export type ConnectErrorCode = keyof typeof CONNECT_ERRORS;

/** The message for a code from the URL, or undefined for anything unknown. */
export function connectErrorMessage(code: string | undefined): string | undefined {
  return code && Object.hasOwn(CONNECT_ERRORS, code) ? CONNECT_ERRORS[code as ConnectErrorCode] : undefined;
}
