/**
 * Supabase server clients
 *
 * Used in Server Components, Server Actions, and API route handlers.
 * Reads/writes auth session cookies so the server knows who is logged in.
 *
 * Two clients are exported:
 *
 *   createServerClient()  — uses the public anon key.
 *                           Respects Row Level Security (RLS).
 *                           Safe to call from any Server Component.
 *
 *   createAdminClient()   — uses the service-role key.
 *                           BYPASSES RLS — only use for trusted server-side
 *                           operations (e.g. background jobs, webhooks).
 *                           NEVER expose the service-role key to the browser.
 *
 * Usage (Server Component or API route):
 *   import { createServerClient } from "@/lib/supabase/server";
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */

import { createServerClient as _createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // the middleware will refresh the session.
          }
        },
      },
    }
  );
}

/**
 * Admin client — bypasses RLS.
 * Only use in trusted server-side code (Server Actions, API routes, jobs).
 * Never call from a Client Component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
