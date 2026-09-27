/**
 * Next.js proxy — Supabase session refresh + optimistic auth redirects
 *
 * Supabase Auth uses short-lived access tokens. This proxy refreshes the
 * session on every matched request so Server Components always receive a
 * valid user, then redirects:
 *   - signed-out visitors away from app routes → /login
 *   - signed-in users away from /login and /signup → /dashboard
 *
 * This is only an optimistic check. The authoritative check is
 * getCurrentContext() in the (dashboard) layout, and RLS in the database.
 *
 * Docs: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PREFIXES = ["/auth/"]; // e.g. /auth/callback
const API_ROUTES_WITH_OWN_AUTH = ["/api/assistant"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const handlesApiAuth = API_ROUTES_WITH_OWN_AUTH.includes(pathname);

  if (!user && !isAuthPage && !isPublic && !handlesApiAuth) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }
  if (user && isAuthPage) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  return supabaseResponse;
}

/** Redirect while keeping any refreshed session cookies. */
function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
