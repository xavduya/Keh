/**
 * Date & time helpers — always in the business timezone (Asia/Manila).
 *
 * The database stores UTC timestamps (timestamptz). Never slice ISO strings
 * to get a date or time: "2026-09-26T10:00:00Z" is 6:00 PM in Manila, not 10 AM.
 * Manila has no daylight saving, so a fixed +08:00 offset is exact.
 */

import { DEFAULT_TIMEZONE } from "@/constants";

const MANILA_OFFSET = "+08:00";

const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEFAULT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DEFAULT_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** "YYYY-MM-DD" of a timestamp, in Manila time. */
export function manilaDateKey(value: string | Date): string {
  return dateKeyFormat.format(new Date(value));
}

/** "6:00 PM" — clock time of a timestamp, in Manila time. */
export function manilaTime(value: string | Date): string {
  return timeFormat.format(new Date(value));
}

/** Today's "YYYY-MM-DD" in Manila. */
export function todayKey(): string {
  return manilaDateKey(new Date());
}

/** Adds whole days to a "YYYY-MM-DD" key. */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The next given weekday (0 = Sunday … 6 = Saturday) strictly after a "YYYY-MM-DD" key. */
export function nextWeekday(dateKey: string, weekday: number): string {
  const current = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  const diff = (weekday - current + 7) % 7 || 7;
  return addDays(dateKey, diff);
}

/** Converts a Manila wall-clock date + "HH:MM" time into a UTC ISO timestamp. */
export function manilaToUtcIso(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00${MANILA_OFFSET}`).toISOString();
}

/** Formats a "YYYY-MM-DD" key (a calendar date, not an instant). */
export function formatDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" }
): string {
  // Noon UTC keeps the same calendar day in every timezone.
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-PH", {
    ...options,
    timeZone: "UTC",
  });
}

/** Formats a timestamp's date in Manila time. */
export function formatManilaDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  return new Date(value).toLocaleDateString("en-PH", { ...options, timeZone: DEFAULT_TIMEZONE });
}
