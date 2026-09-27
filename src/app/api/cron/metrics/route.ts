/**
 * POST /api/cron/metrics — saves the latest reach and engagement for posts
 * published in the last 30 days. Called hourly by pg_cron (migration 016)
 * with `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { isPublishingEnabled } from "@/lib/env";
import { collectMetrics } from "@/services/publishing.service";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPublishingEnabled()) {
    return NextResponse.json({ skipped: "Publishing is turned off (PUBLISHING_ENABLED)." });
  }
  try {
    const result = await collectMetrics();
    console.info("[cron] metrics", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] metrics failed", err);
    return NextResponse.json({ error: "Metrics run failed" }, { status: 500 });
  }
}
