/**
 * Environment variables
 *
 * Single place that reads and validates env vars, so a missing key fails
 * loudly with a clear message instead of an opaque Supabase error.
 *
 * NEXT_PUBLIC_* values must be referenced literally (process.env.NEXT_PUBLIC_X)
 * so Next.js can inline them into the browser bundle.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

/** Public values — safe in both server and browser code. */
export const publicEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ),
};

/**
 * Secret key (sb_secret_…) — bypasses RLS.
 * Server-only: never call this from a Client Component.
 */
export function getSupabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
}

/** Meta (Facebook / Instagram) app credentials are set. */
export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/**
 * Meta app credentials for the Facebook / Instagram OAuth flow.
 * Server-only: the app secret must never reach the browser.
 */
export function getMetaCredentials(): { appId: string; appSecret: string } {
  return {
    appId: required("META_APP_ID", process.env.META_APP_ID),
    appSecret: required("META_APP_SECRET", process.env.META_APP_SECRET),
  };
}

/**
 * Posting to Facebook / Instagram and collecting their metrics. Off unless
 * PUBLISHING_ENABLED=true: for the MVP, "Schedule" and "Publish now" only
 * save posts to the calendar, and /api/cron/* do nothing.
 */
export function isPublishingEnabled(): boolean {
  return process.env.PUBLISHING_ENABLED === "true";
}
