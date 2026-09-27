/**
 * Supabase browser client
 *
 * Used in Client Components and browser-side code only.
 * Initialised with the publishable key — safe to expose to the browser.
 *
 * This creates a new client instance on every call, which is the recommended
 * pattern for Next.js App Router (avoids sharing state between requests).
 *
 * Usage:
 *   import { createBrowserClient } from "@/lib/supabase/client";
 *   const supabase = createBrowserClient();
 *   const { data } = await supabase.from("products").select("*");
 */

import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

export function createBrowserClient() {
  return _createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey
  );
}
