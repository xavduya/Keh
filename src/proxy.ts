/**
 * Next.js middleware — Supabase session refresh
 *
 * Supabase Auth uses short-lived access tokens. This middleware runs on every
 * request that matches the config below and refreshes the session so Server
 * Components always receive a valid user.
 *
 * Without this, a user whose token expires mid-session would be silently
 * treated as unauthenticated on the next Server Component render.
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  console.log("Supabase environment check:", {
    cwd: process.cwd(),
    hashUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hashKey: Boolean(process.env.NEXT_PUBLIC_PUBLISHABLE_KEY),
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward cookies onto the request object so downstream code can read them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response so Set-Cookie headers are sent to the browser
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do NOT remove this call.
  // It must come before any auth checks so the session is up to date.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on all routes EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets
     *
     * Add protected-route redirects here in Phase 5 when auth is wired up.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
