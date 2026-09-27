/**
 * POST /api/cron/publish — publishes posts whose scheduled time has come.
 * Called every 5 minutes by pg_cron (migration 016) with
 * `Authorization: Bearer <CRON_SECRET>`.
 */

import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { isPublishingEnabled } from "@/lib/env";
import { publishDuePosts } from "@/services/publishing.service";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPublishingEnabled()) {
    return NextResponse.json({ skipped: "Publishing is turned off (PUBLISHING_ENABLED)." });
  }
  try {
    const result = await publishDuePosts();
    console.info("[cron] publish", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] publish failed", err);
    return NextResponse.json({ error: "Publish run failed" }, { status: 500 });
  }
}
