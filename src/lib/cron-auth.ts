import { timingSafeEqual } from "node:crypto";

/**
 * Checks the `Authorization: Bearer <CRON_SECRET>` header on /api/cron/*
 * (sent by pg_cron, migration 016). Fails closed when CRON_SECRET isn't set.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
