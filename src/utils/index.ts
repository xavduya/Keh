/**
 * Shared utilities
 *
 * Small pure functions used throughout the application.
 * These replace the inline helpers scattered across the prototype's app.js.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Time & date
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a "HH:MM" 24-hour time string to a 12-hour AM/PM label.
 * @example timeLabel("18:00") → "6:00 PM"
 */
export function timeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Formats an ISO date string (or "YYYY-MM-DD") as a human-readable date.
 * @example formatDate("2026-09-26") → "Saturday, September 26, 2026"
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", options);
}

/**
 * Returns a "YYYY-MM-DD" string from an ISO date string or Date object.
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a number with locale-appropriate thousands separators.
 * @example formatNumber(4200) → "4,200"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-PH");
}

/**
 * Formats a price in PHP.
 * @example formatPrice(150) → "₱150"
 */
export function formatPrice(value: number): string {
  return `₱${value.toLocaleString("en-PH")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform display helpers
// ─────────────────────────────────────────────────────────────────────────────

import type { Platform } from "@/types";
import { PLATFORMS } from "@/constants";

/** Returns the single-character symbol used in platform badges. */
export function platformSymbol(platform: Platform): string {
  return PLATFORMS.find((p) => p.value === platform)?.symbol ?? "?";
}

/** Returns the human-readable label for a platform. */
export function platformLabel(platform: Platform): string {
  return PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
}

// ─────────────────────────────────────────────────────────────────────────────
// String helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTML-escapes a string to prevent XSS when interpolating into HTML.
 * Only needed for legacy string-template patterns; prefer JSX in components.
 */
export function escHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ] ?? c)
  );
}

/**
 * Up to two initials for an avatar.
 * @example initials("Juan Dela Cruz") → "JD"
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Truncates a string to a maximum length, appending "…" if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/** Posts that are live (or going live) can't be changed from Keh. */
export function isCampaignEditable(posts: { status: string }[]): boolean {
  return posts.every((p) => p.status !== "PUBLISHED" && p.status !== "PUBLISHING");
}
