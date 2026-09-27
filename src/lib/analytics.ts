/**
 * Analytics calculations
 *
 * Pure functions that turn posts + their latest metrics into totals,
 * trends and findings. Used on the server (Home) and in the browser
 * (Analytics platform filter), so they must stay free of I/O.
 *
 *   post_metrics → getPosts() → these functions → UI (and later: AI prompts)
 *
 * Only PUBLISHED posts count toward performance. A post's date is when it
 * was published (falling back to when it was scheduled), in Manila time.
 */

import type { Platform, PostPerformance, Product } from "@/types";
import { formatPrice, platformLabel } from "@/utils";
import { addDays, formatDateKey, manilaDateKey, manilaWeekdayHour } from "@/utils/datetime";

// ─────────────────────────────────────────────────────────────────────────────
// Basics
// ─────────────────────────────────────────────────────────────────────────────

export function postDateKey(post: PostPerformance): string {
  return manilaDateKey(post.publishedAt ?? post.scheduledAt);
}

export function publishedPosts(posts: PostPerformance[]): PostPerformance[] {
  return posts.filter((p) => p.status === "PUBLISHED");
}

/** Published posts that have collected metrics. */
export function measuredPosts(posts: PostPerformance[]): PostPerformance[] {
  return publishedPosts(posts).filter((p) => p.reach > 0);
}

export function filterByPlatform(posts: PostPerformance[], platform: Platform | null) {
  return platform ? posts.filter((p) => p.platform === platform) : posts;
}

/** Posts dated within (fromExclusive, toInclusive], as "YYYY-MM-DD" keys. */
function inRange(posts: PostPerformance[], fromExclusive: string, toInclusive: string) {
  return posts.filter((p) => {
    const d = postDateKey(p);
    return d > fromExclusive && d <= toInclusive;
  });
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

// ─────────────────────────────────────────────────────────────────────────────
// Period summary — last 30 days vs the 30 days before
// ─────────────────────────────────────────────────────────────────────────────

export interface PeriodTotals {
  reach: number;
  interactions: number;
  clicks: number;
  published: number;
}

export interface PeriodSummary {
  current: PeriodTotals;
  previous: PeriodTotals;
  /** null when there is nothing to compare against */
  reachGrowthPct: number | null;
  interactionsGrowthPct: number | null;
}

function totals(posts: PostPerformance[]): PeriodTotals {
  const published = publishedPosts(posts);
  return {
    reach: published.reduce((sum, p) => sum + p.reach, 0),
    interactions: published.reduce((sum, p) => sum + p.interactions, 0),
    clicks: published.reduce((sum, p) => sum + p.clicks, 0),
    published: published.length,
  };
}

export const PERIOD_DAYS = 30;

export function periodSummary(posts: PostPerformance[], today: string): PeriodSummary {
  const start = addDays(today, -PERIOD_DAYS);
  const current = totals(inRange(posts, start, today));
  const previous = totals(inRange(posts, addDays(start, -PERIOD_DAYS), start));
  return {
    current,
    previous,
    reachGrowthPct: percentChange(current.reach, previous.reach),
    interactionsGrowthPct: percentChange(current.interactions, previous.interactions),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly reach — last N weeks ending today
// ─────────────────────────────────────────────────────────────────────────────

export interface WeeklyReachPoint {
  /** Week start, e.g. "Sep 1" */
  label: string;
  reach: number;
}

export function weeklyReach(posts: PostPerformance[], today: string, weeks = 8): WeeklyReachPoint[] {
  return Array.from({ length: weeks }, (_, i) => {
    const end = addDays(today, -7 * (weeks - 1 - i));
    const start = addDays(end, -7);
    return {
      label: formatDateKey(addDays(start, 1), { month: "short", day: "numeric" }),
      reach: totals(inRange(posts, start, end)).reach,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Findings — what worked best
// ─────────────────────────────────────────────────────────────────────────────

export interface Finding<T> {
  value: T;
  avgReach: number;
  /** % above the average measured post */
  liftPct: number;
  postCount: number;
}

export interface Findings {
  measuredCount: number;
  avgReach: number;
  bestProduct?: Finding<Product>;
  bestPlatform?: Finding<Platform>;
  /** e.g. "Friday evening" */
  bestWindow?: Finding<string>;
}

function timeOfDay(hour: number): string {
  if (hour < 6) return "night";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * Groups measured posts and returns the group with the highest average reach.
 * Groups with fewer than `minPosts` posts are ignored when any group has
 * that many, so one lucky post doesn't win. With a single group (e.g. only
 * one product) that group is returned with a 0% lift — there's nothing to
 * compare it against.
 */
function bestGroup<T>(
  posts: PostPerformance[],
  keyOf: (p: PostPerformance) => string,
  valueOf: (p: PostPerformance) => T,
  overallAvg: number,
  minPosts = 2
): Finding<T> | undefined {
  const groups = new Map<string, PostPerformance[]>();
  for (const p of posts) {
    const key = keyOf(p);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  if (groups.size === 0) return undefined;

  const largest = Math.max(...[...groups.values()].map((g) => g.length));
  const threshold = Math.min(minPosts, largest);

  let best: Finding<T> | undefined;
  for (const group of groups.values()) {
    if (group.length < threshold) continue;
    const avgReach = average(group.map((p) => p.reach));
    if (!best || avgReach > best.avgReach) {
      best = {
        value: valueOf(group[0]),
        avgReach: Math.round(avgReach),
        liftPct: groups.size === 1 ? 0 : Math.round((avgReach / overallAvg - 1) * 100),
        postCount: group.length,
      };
    }
  }
  return best;
}

export function findings(posts: PostPerformance[]): Findings {
  const measured = measuredPosts(posts);
  const avgReach = average(measured.map((p) => p.reach));
  if (measured.length === 0) return { measuredCount: 0, avgReach: 0 };

  const windowOf = (p: PostPerformance) => {
    const { weekday, hour } = manilaWeekdayHour(p.publishedAt ?? p.scheduledAt);
    return `${weekday} ${timeOfDay(hour)}`;
  };

  return {
    measuredCount: measured.length,
    avgReach: Math.round(avgReach),
    bestProduct: bestGroup(measured, (p) => p.productId, (p) => p.product, avgReach),
    bestPlatform: bestGroup(measured, (p) => p.platform, (p) => p.platform, avgReach),
    bestWindow: bestGroup(measured, windowOf, windowOf, avgReach),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-language insights (template-based until the AI layer exists)
// ─────────────────────────────────────────────────────────────────────────────

export function insights(f: Findings, summary: PeriodSummary): string[] {
  if (f.measuredCount === 0) return [];
  const lines: string[] = [];

  if (f.bestProduct && f.bestProduct.liftPct > 0) {
    lines.push(
      `${f.bestProduct.value.name} posts reached ${f.bestProduct.liftPct}% more people than your average post.`
    );
  }
  if (f.bestPlatform && f.bestPlatform.liftPct > 0) {
    lines.push(
      `${platformLabel(f.bestPlatform.value)} is where your posts travel furthest — about ${f.bestPlatform.avgReach.toLocaleString()} people per post.`
    );
  }
  if (f.bestWindow && f.bestWindow.liftPct > 0) {
    lines.push(`Posts that go out on ${f.bestWindow.value} get the most attention.`);
  }
  if (summary.reachGrowthPct !== null) {
    lines.push(
      summary.reachGrowthPct >= 0
        ? `Your reach is up ${summary.reachGrowthPct}% compared with the ${PERIOD_DAYS} days before.`
        : `Reach dipped ${Math.abs(summary.reachGrowthPct)}% versus the previous ${PERIOD_DAYS} days — a steady posting rhythm helps.`
    );
  }
  if (summary.current.published > 0) {
    lines.push(`You published ${summary.current.published} posts in the last ${PERIOD_DAYS} days.`);
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Next best move — the Home recommendation card
// ─────────────────────────────────────────────────────────────────────────────

export interface Recommendation {
  title: string;
  body: string;
  /** Short strategy chips, e.g. "Instagram first", "Friday evening" */
  chips: string[];
  cta: string;
  href: string;
  imageUrl?: string;
  /** Plain-language explanation for "Why this recommendation?" */
  why: string;
}

export function recommendNextMove(f: Findings, products: Product[]): Recommendation {
  const active = products.filter((p) => p.availability === "ACTIVE");

  if (active.length === 0) {
    return {
      title: "Add your first product to get started.",
      body: "Every campaign spotlights something you sell. Add a product or service with a photo and price, and Keh will write about it for you.",
      chips: [],
      cta: "Add a product",
      href: "/products",
      why: "You don't have any available products yet, and campaigns are built around one.",
    };
  }

  const chips = (product: Product) =>
    [
      f.bestPlatform && `${platformLabel(f.bestPlatform.value)} first`,
      `Show the ${formatPrice(product.promoPrice ?? product.price)} price`,
      f.bestWindow?.value ?? "Friday, 6:00 PM",
    ].filter((c): c is string => Boolean(c));

  const star = f.bestProduct?.value;
  if (star && f.bestProduct!.liftPct > 0 && active.some((p) => p.id === star.id)) {
    return {
      title: `Give your ${star.name} a little more spotlight.`,
      body: `Your ${star.name} posts reached ${f.bestProduct!.liftPct}% more people than your average post. Let's keep the momentum going.`,
      chips: chips(star),
      cta: "Create recommended campaign",
      href: `/campaigns/new?product=${star.id}`,
      imageUrl: star.imageUrl || undefined,
      why: `Across your last ${f.measuredCount} published posts with results, ${star.name} averaged ${f.bestProduct!.avgReach.toLocaleString()} people reached per post, versus ${f.avgReach.toLocaleString()} overall.`,
    };
  }

  // No standout product: feature the one that's been promoted least.
  const next = [...active].sort((a, b) => (a.campaignCount ?? 0) - (b.campaignCount ?? 0))[0];
  const timing = f.bestWindow ? ` Your posts do best on ${f.bestWindow.value}.` : "";
  return {
    title: `Put your ${next.name} in the spotlight.`,
    body:
      (next.campaignCount ?? 0) === 0
        ? `It hasn't been featured in a campaign yet. A quick one takes about two minutes.`
        : `A fresh post keeps it top of mind.${timing}`,
    chips: chips(next),
    cta: "Create campaign",
    href: `/campaigns/new?product=${next.id}`,
    imageUrl: next.imageUrl || undefined,
    why:
      f.measuredCount === 0
        ? `There aren't any results from published posts yet, so Keh suggests the product you've promoted least. Recommendations get sharper as results come in.`
        : active.length === 1
          ? `Based on your last ${f.measuredCount} published posts with results, Keh picked the platform and time that reached the most people.`
          : `No product clearly outperforms the others yet, so Keh suggests ${next.name}, which has appeared in the fewest campaigns.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Posting slot — turns the best window into a concrete day + time
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_OF_DAY_START: Record<string, string> = {
  morning: "09:00",
  midday: "12:00",
  afternoon: "15:00",
  evening: "18:00",
  night: "20:00",
};

export interface PostingSlot {
  /** 0 = Sunday … 6 = Saturday (Manila) */
  weekday: number;
  /** "HH:MM" (Manila) */
  time: string;
  /** e.g. "Friday evening" */
  label: string;
  /** true when based on the business's own results, false for the default */
  fromResults: boolean;
}

/** Best time to post: the business's best window, else Friday 6 PM. */
export function recommendedSlot(f: Findings): PostingSlot {
  const [day, part] = f.bestWindow?.value.split(" ") ?? [];
  const weekday = WEEKDAYS.indexOf(day);
  if (weekday >= 0 && part && TIME_OF_DAY_START[part]) {
    return { weekday, time: TIME_OF_DAY_START[part], label: f.bestWindow!.value, fromResults: true };
  }
  return { weekday: 5, time: "18:00", label: "Friday evening", fromResults: false };
}
