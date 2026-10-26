"use client";

/**
 * Keeps open tabs up to date without a manual reload.
 *
 * 1. Supabase Realtime (migration 011): listens for changes to this
 *    business's data — made by another person on the account, another tab,
 *    or a script — and re-fetches the current page's server data.
 * 2. Tab focus: when the owner comes back to the tab, re-fetch too. This
 *    catches anything missed while the connection was down (e.g. laptop
 *    asleep).
 *
 * router.refresh() re-renders server components only: client state (open
 * dialogs, the campaign wizard, text being typed) is kept.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

/** Group bursts of changes (e.g. a campaign and its posts) into one refresh. */
const REFRESH_DEBOUNCE_MS = 800;
/** Don't re-fetch on every quick tab switch. */
const FOCUS_REFRESH_MIN_GAP_MS = 15_000;

/** Tables that belong to a business, and the column that links them. */
const BUSINESS_TABLES: { table: string; column: string }[] = [
  { table: "businesses", column: "id" },
  { table: "brand_profiles", column: "business_id" },
  { table: "subscriptions", column: "business_id" },
  { table: "products", column: "business_id" },
  { table: "campaigns", column: "business_id" },
  { table: "ai_recommendations", column: "business_id" },
];
/** No business_id column — RLS already limits events to the owner's rows. */
const OWNED_TABLES = ["social_posts", "post_metrics"];

export function LiveRefresh({ businessId }: { businessId: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastRefresh = Date.now();
    let dirty = false;

    function refresh() {
      timer = undefined;
      if (document.visibilityState !== "visible") { dirty = true; return; }
      dirty = false;
      lastRefresh = Date.now();
      router.refresh();
    }
    function scheduleRefresh() {
      dirty = true;
      if (document.visibilityState !== "visible") return;
      // A continuous event stream must not keep postponing the same refresh.
      if (timer !== undefined) return;
      timer = setTimeout(refresh, Math.max(REFRESH_DEBOUNCE_MS, FOCUS_REFRESH_MIN_GAP_MS - (Date.now() - lastRefresh)));
    }

    // 1. Realtime
    const supabase = createBrowserClient();
    const channel = supabase.channel(`business:${businessId}`);
    for (const { table, column } of BUSINESS_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${column}=eq.${businessId}` },
        scheduleRefresh
      );
    }
    for (const table of OWNED_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe();

    // 2. Coming back to the tab
    function onVisible() {
      if (document.visibilityState === "visible" && (dirty || Date.now() - lastRefresh > FOCUS_REFRESH_MIN_GAP_MS)) {
        clearTimeout(timer);
        timer = undefined;
        refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [businessId, router]);

  return null;
}
