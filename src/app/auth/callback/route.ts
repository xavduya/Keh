/**
 * Auth email callback (sign-up confirmation, password reset, email change)
 *
 * Supabase's email links land here with a one-time `code` (PKCE). Exchange
 * it for a session cookie, then continue to `next` (a same-site path, e.g.
 * /reset-password) or the dashboard.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/request-origin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const reason = next === "/reset-password" ? "reset" : "confirm";
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
