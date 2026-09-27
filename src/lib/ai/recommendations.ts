/**
 * Weekly recommendations ("Recommended for this week", "Ideas to put into
 * action"). Server-only.
 *
 * Asks the configured language model (providers.ts) for three specific,
 * data-backed recommendations; falls back to rules built on the business's
 * results when no model is configured or its reply is unusable. Either way
 * the output is sanitized: only real, available product IDs, known enum
 * values, bounded text.
 */

import { z } from "zod";
import type { CampaignGoal, Product, RecommendationSource, RecommendationType } from "@/types";
import type { NewRecommendation } from "@/services/recommendation.service";
import { recommendNextMove, type Findings } from "@/lib/analytics";
import { formatPrice, platformLabel } from "@/utils";
import { formatDateKey, todayKey } from "@/utils/datetime";
import type { MarketingData } from "./context";
import { generateJson } from "./providers";

const TYPES = ["CONTENT_FORMAT", "POSTING_TIME", "PRODUCT_SPOTLIGHT", "CAPTION_STYLE", "PLATFORM_FOCUS", "CAMPAIGN_IDEA"] as const;
const SOURCES = ["GENERAL_BEST_PRACTICE", "BUSINESS_PROFILE", "HISTORICAL_PERFORMANCE", "AUDIENCE_DATA"] as const;
const GOALS = ["PROMOTE_PRODUCT", "GET_MORE_ORDERS", "GET_STORE_VISITS", "ANNOUNCEMENT", "NEW_PRODUCT", "PROMOTION", "KEEP_PAGE_ACTIVE"] as const;

const ModelRecommendationSchema = z.object({
  type: z.enum(TYPES),
  title: z.string().min(3),
  explanation: z.string().min(10),
  source: z.enum(SOURCES).catch("BUSINESS_PROFILE"),
  productId: z.string().optional(),
  actionGoal: z.enum(GOALS).optional().catch(undefined),
  actionLabel: z.string().optional(),
  chips: z.array(z.string()).optional(),
  promotion: z.string().optional(),
  confidence: z.number().optional(),
});
const ModelReplySchema = z.object({ recommendations: z.array(z.unknown()) });

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").trim();

/** Local moments in the coming days that a campaign could ride on. */
function upcomingMoments(today: string): string[] {
  const [, month, day] = today.split("-").map(Number);
  const moments: string[] = [];
  if (day <= 15) moments.push(`payday on the 15th (in ${15 - day} days)`);
  else moments.push("payday on the 30th");
  if (month >= 9 && month <= 12) moments.push(month === 12 ? "Christmas week" : "the ber months / early Christmas shopping");
  if (month === 2 && day <= 14) moments.push("Valentine's Day");
  if (month >= 3 && month <= 5) moments.push("summer");
  if (month >= 6 && month <= 8) moments.push("rainy season");
  return moments;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────

function systemPrompt(data: MarketingData): string {
  const today = todayKey();
  return [
    "You are Keh, a practical marketing manager for a small business in the Philippines.",
    `Today is ${formatDateKey(today)} (${today}), Asia/Manila. Upcoming local moments: ${upcomingMoments(today).join(", ")}.`,
    "Write exactly 3 recommendations for this week — the owner will act on them in a few clicks.",
    "",
    "Respond with ONE JSON object and nothing else:",
    `{ "recommendations": [ {
  "type": "PRODUCT_SPOTLIGHT|POSTING_TIME|PLATFORM_FOCUS|CAMPAIGN_IDEA|CONTENT_FORMAT|CAPTION_STYLE",
  "title": "Action-first, under 70 characters, names the product or the change",
  "explanation": "1-2 plain sentences on WHY, citing the business's own data when available",
  "source": "HISTORICAL_PERFORMANCE|BUSINESS_PROFILE|GENERAL_BEST_PRACTICE|AUDIENCE_DATA",
  "productId": "<id from products, when about a product>",
  "actionGoal": "PROMOTE_PRODUCT|GET_MORE_ORDERS|GET_STORE_VISITS|ANNOUNCEMENT|NEW_PRODUCT|PROMOTION|KEEP_PAGE_ACTIVE",
  "actionLabel": "Button text, 2-4 words, e.g. Plan the promo",
  "chips": ["up to 3 short tactics, e.g. 'TikTok first', 'Friday 6 PM', 'Show ₱90 price'"],
  "promotion": "only if suggesting an offer",
  "confidence": 0.0-1.0
} ] }`,
    "",
    "Rules:",
    "- The 3 must be different kinds: one product to spotlight, one change to when/where to post (from the results), one campaign idea tied to an upcoming date or the catalog.",
    "- Be specific to THIS business: name real products, prices, the location, the audience. No generic advice like 'post consistently' or 'engage with your audience'.",
    "- Only cite numbers that appear in the performance data. With no performance data, say it's based on the profile and use source BUSINESS_PROFILE or GENERAL_BEST_PRACTICE.",
    "- productId must be an ACTIVE product id from the list. Don't invent products, prices or discounts the owner didn't set; if you suggest an offer, make it modest and say it's a suggestion.",
    "- Plain text only (no markdown).",
    "",
    `Business data:\n${JSON.stringify({
      business: data.context.business,
      brandProfile: data.context.brandProfile,
      products: data.products
        .filter((p) => p.availability === "ACTIVE")
        .slice(0, 12)
        .map((p) => ({ id: p.id, name: p.name, price: p.price, promoPrice: p.promoPrice, category: p.category, description: p.description.slice(0, 200), timesPromoted: p.campaignCount ?? 0 })),
      performance: data.context.performance,
      bestPostingSlot: data.context.slot,
    })}`,
  ].join("\n");
}

async function fromModel(data: MarketingData): Promise<NewRecommendation[] | null> {
  const text = await generateJson(systemPrompt(data), [
    { role: "user", content: "Write this week's 3 recommendations." },
  ]);
  if (!text) return null;
  try {
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const reply = ModelReplySchema.safeParse(JSON.parse(json));
    if (!reply.success) return null;
    const recs = reply.data.recommendations.flatMap((raw) => {
      const r = ModelRecommendationSchema.safeParse(raw);
      return r.success ? [{ ...r.data, chips: r.data.chips ?? [], generatedBy: "ai" as const }] : [];
    });
    return recs.length ? recs : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Guided (rules) fallback
// ─────────────────────────────────────────────────────────────────────────────

function fromRules(data: MarketingData): NewRecommendation[] {
  const f: Findings = data.findings;
  const active = data.products.filter((p) => p.availability === "ACTIVE");
  const slot = data.context.slot;
  const recs: NewRecommendation[] = [];
  const results = f.measuredCount > 0;

  // 1. What to feature (same logic as the Home card's fallback)
  const next = recommendNextMove(f, data.products);
  const productId = new URL(next.href, "http://x").searchParams.get("product") ?? undefined;
  recs.push({
    type: "PRODUCT_SPOTLIGHT",
    title: next.title.replace(/\.$/, ""),
    explanation: next.body,
    source: results && f.bestProduct ? "HISTORICAL_PERFORMANCE" : "BUSINESS_PROFILE",
    productId,
    actionGoal: productId ? "PROMOTE_PRODUCT" : undefined,
    actionLabel: productId ? "Create campaign" : "Add a product",
    chips: next.chips,
    confidence: results ? 0.7 : 0.4,
    generatedBy: "guided",
  });

  // 2. When / where to post
  if (f.bestPlatform && f.bestPlatform.liftPct > 10) {
    recs.push({
      type: "PLATFORM_FOCUS",
      title: `Lead with ${platformLabel(f.bestPlatform.value)} this week`,
      explanation: `Your ${platformLabel(f.bestPlatform.value)} posts reach about ${f.bestPlatform.avgReach.toLocaleString()} people each — ${f.bestPlatform.liftPct}% more than your average post.`,
      source: "HISTORICAL_PERFORMANCE",
      chips: [`${platformLabel(f.bestPlatform.value)} first`, slot.label],
      confidence: 0.65,
      generatedBy: "guided",
    });
  } else {
    recs.push({
      type: "POSTING_TIME",
      title: `Post on ${slot.label}`,
      explanation: slot.fromResults && f.bestWindow
        ? `Your posts on ${slot.label} have reached ${f.bestWindow.liftPct}% more people than your average post.`
        : `${slot.label} is when many local customers scroll after work. Keh will fine-tune this once your posts have results.`,
      source: slot.fromResults ? "HISTORICAL_PERFORMANCE" : "GENERAL_BEST_PRACTICE",
      chips: [slot.label, `Around ${slot.time}`],
      confidence: slot.fromResults ? 0.6 : 0.35,
      generatedBy: "guided",
    });
  }

  // 3. A campaign idea tied to the catalog or the calendar
  const promo = active.find((p) => p.promoPrice !== undefined && p.promoPrice < p.price);
  const moment = upcomingMoments(todayKey())[0];
  const pick: Product | undefined = promo ?? active.find((p) => p.id !== productId) ?? active[0];
  if (pick) {
    recs.push({
      type: "CAMPAIGN_IDEA",
      title: promo ? `Push the ${formatPrice(promo.promoPrice!)} ${promo.name} deal` : `${pick.name} for ${moment}`,
      explanation: promo
        ? `${promo.name} is already on promo (${formatPrice(promo.promoPrice!)} from ${formatPrice(promo.price)}). A short deadline gives people a reason to come in now.`
        : `With ${moment} coming up, people are ready to spend — a timely post featuring ${pick.name} makes the most of it.`,
      source: "BUSINESS_PROFILE",
      productId: pick.id,
      actionGoal: "PROMOTION" as CampaignGoal,
      actionLabel: "Plan the promo",
      chips: [promo ? `Show ${formatPrice(promo.promoPrice!)} price` : moment, slot.label],
      promotion: promo ? `${formatPrice(promo.promoPrice!)} (save ${formatPrice(promo.price - promo.promoPrice!)})` : undefined,
      confidence: 0.5,
      generatedBy: "guided",
    });
  }
  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

function sanitize(recs: NewRecommendation[], data: MarketingData): NewRecommendation[] {
  const activeIds = new Set(data.products.filter((p) => p.availability === "ACTIVE").map((p) => p.id));
  const seen = new Set<string>();
  return recs
    // A recommendation about a product that doesn't exist (or isn't for sale) is dropped, not patched.
    .filter((r) => !r.productId || activeIds.has(r.productId))
    .map((r) => ({
      ...r,
      type: r.type as RecommendationType,
      source: r.source as RecommendationSource,
      title: clip(plain(r.title), 90),
      explanation: clip(plain(r.explanation), 400),
      productId: r.productId && activeIds.has(r.productId) ? r.productId : undefined,
      actionLabel: r.actionLabel ? clip(plain(r.actionLabel), 30) : undefined,
      chips: r.chips.map((c) => clip(plain(c), 32)).filter(Boolean).slice(0, 3),
      promotion: r.promotion ? clip(plain(r.promotion), 80) : undefined,
      confidence: r.confidence === undefined ? undefined : Math.min(Math.max(r.confidence, 0), 1),
    }))
    .filter((r) => {
      const key = r.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

/**
 * This week's recommendations: from the model when available, else from
 * rules. If the model's reply sanitizes down to fewer than three, the gap is
 * topped up with rules-based ones of kinds not already covered.
 */
export async function generateRecommendations(data: MarketingData): Promise<NewRecommendation[]> {
  const rules = sanitize(fromRules(data), data);
  const fromAi = await fromModel(data);
  if (!fromAi) return rules;

  const recs = sanitize(fromAi, data);
  for (const extra of rules) {
    if (recs.length >= 3) break;
    if (!recs.some((r) => r.type === extra.type)) recs.push(extra);
  }
  return recs.length ? recs : rules;
}
