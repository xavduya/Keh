/**
 * Current request context — the signed-in user and their business.
 *
 * This is the authoritative auth check for app pages (the proxy redirect is
 * only optimistic). Wrapped in React `cache` so the layout and page can both
 * call it during one render without extra Supabase round-trips.
 *
 * Usage (Server Component / Server Action):
 *   const { user, business } = await getCurrentContext();
 */

import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getBusinessByOwnerId } from "@/services/business.service";
import type { Business } from "@/types";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
}

export interface CurrentContext {
  user: CurrentUser;
  business: Business;
}

export const getCurrentContext = cache(async (): Promise<CurrentContext> => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, business] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    getBusinessByOwnerId(user.id),
  ]);

  if (!business) {
    // handle_new_user() (migration 005) creates the business on sign-up.
    // Missing means the account was created before the migrations were applied.
    throw new Error(
      "No business found for this account. Apply the Supabase migrations, then sign up again."
    );
  }

  const email = user.email ?? "";
  return {
    user: {
      id: user.id,
      email,
      fullName: profile?.full_name || email.split("@")[0] || "Owner",
    },
    business,
  };
});
