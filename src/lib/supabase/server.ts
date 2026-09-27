/**
 * Supabase server clients
 *
 * Used in Server Components, Server Actions, and Route Handlers.
 * Reads/writes auth session cookies so the server knows who is logged in.
 *
 * Two clients are exported:
 *
 *   createServerClient()  — uses the publishable key.
 *                           Respects Row Level Security (RLS).
 *                           Safe to call from any Server Component.
 *
 *   createAdminClient()   — uses the secret key.
 *                           BYPASSES RLS — only use for trusted server-side
 *                           operations (e.g. background jobs, webhooks).
 *                           NEVER expose the secret key to the browser.
 *
 * Usage (Server Component or Route Handler):
 *   import { createServerClient } from "@/lib/supabase/server";
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */

import { createServerClient as _createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv, getSupabaseSecretKey } from "@/lib/env";
import type { Database } from "./database.types";

export async function createServerClient() {
  const cookieStore = await cookies();

  return _createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component — cookies can only be
            // written from a Server Action or Route Handler. Ignore here;
            // the proxy refreshes the session.
          }
        },
      },
    }
  );
}

/**
 * Admin client — bypasses RLS.
 * Only use in trusted server-side code (Server Actions, Route Handlers, jobs).
 * Never call from a Client Component.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.supabaseUrl, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
