/**
 * Keh AI marketing manager
 *
 * generateMarketingAdvice() answers the owner's marketing questions and can
 * fill in the campaign wizard for them ("action"), always listing every field
 * it changed and why. With GEMINI_API_KEY (or OPENAI_API_KEY) set it asks a
 * model (see providers.ts); otherwise — or if the call fails or returns
 * something unusable — a built-in guided engine answers from the business
 * profile, catalog and results.
 *
 * Server-only: called from app/api/assistant/route.ts. Every response is
 * sanitized (sanitizeResponse) so the wizard only ever receives real product
 * IDs, valid future dates and bounded text.
 */

import type {
  BrandProfile,
  Business,
  CampaignDraft,
  CampaignGoal,
  FieldChangeNotification,
  MarketingAssistantResponse,
  MarketingCampaignAction,
  MarketingIdea,
  Platform,
  Product,
} from "@/types";
import {
  MarketingCampaignActionSchema,
  MarketingIdeaSchema,
  type MarketingAssistantRequestSchema,
} from "@/lib/validation/schemas";
import type { PostingSlot } from "@/lib/analytics";
import { formatPrice } from "@/utils";
import { formatDateKey, nextWeekday, todayKey } from "@/utils/datetime";
import { z } from "zod";
import { activeProvider, generateJson } from "./providers";

type MarketingAssistantRequest = z.infer<
  typeof MarketingAssistantRequestSchema
>;

export interface MarketingAssistantContext {
  business: Pick<
    Business,
    | "name"
    | "description"
    | "industry"
    | "location"
    | "targetAudience"
    | "preferredLanguage"
    | "operatingHours"
    | "delivery"
    | "payment"
  >;
  brandProfile: Pick<
    BrandProfile,
    "tone" | "defaultCTA" | "brandGuidelines"
  > | null;
  products: Pick<
    Product,
    | "id"
    | "name"
    | "description"
    | "price"
    | "promoPrice"
    | "category"
    | "availability"
    | "aiNotes"
  >[];
  /** The business's own results; null until published posts have metrics. */
  performance: {
    measuredPosts: number;
    avgReach: number;
    reachGrowthPct: number | null;
    bestProductName?: string;
    bestPlatform?: Platform;
    insights: string[];
  } | null;
  /** Best time to post: from results, or the Friday-evening default. */
  slot: PostingSlot;
  /** The business's latest captions, so the model doesn't repeat itself. */
  recentCaptions?: string[];
}

/**
 * Model output is parsed leniently: a usable answer is kept even when an
 * idea or the action is malformed — those parts are validated one by one
 * (ideas) or repaired/dropped by sanitizeResponse (action).
 */
const StructuredResultSchema = z.object({
  answer: z.string().min(1),
  ideas: z.array(z.unknown()).optional(),
  action: z.unknown().optional(),
});
const LenientActionSchema = MarketingCampaignActionSchema.extend({
  // Clamped to 0–4 during sanitizing instead of rejecting the reply.
  suggestedStep: z.number().optional(),
});

/** Models often send `null` for "not set"; treat it as absent. */
function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)])
    );
  }
  return value;
}

function chooseProduct(
  question: string,
  products: MarketingAssistantContext["products"],
  currentProductId?: string,
  bestProductName?: string
): MarketingAssistantContext["products"][number] | null {
  const normalizedQuestion = question.toLocaleLowerCase();
  const availableProducts = products.filter(
    (product) => product.availability === "ACTIVE"
  );
  if (availableProducts.length === 0) return null;

  // If question explicitly mentions a product name:
  const mentioned = availableProducts.find((p) =>
    normalizedQuestion.includes(p.name.toLocaleLowerCase())
  );
  if (mentioned) return mentioned;

  // If currentDraft already selected a product:
  if (currentProductId) {
    const current = availableProducts.find((p) => p.id === currentProductId);
    if (current) return current;
  }

  // Next, the product with the best results so far:
  const best = availableProducts.find((p) => p.name === bestProductName);
  if (best) return best;

  // Next, pick product on promo:
  const promoProduct = availableProducts.find(
    (p) => p.promoPrice !== undefined
  );
  if (promoProduct) return promoProduct;

  return availableProducts[0];
}

function getCallToAction(
  context: Pick<MarketingAssistantContext, "business" | "brandProfile">
): string {
  const { business, brandProfile } = context;
  if (brandProfile) {
    switch (brandProfile.defaultCTA) {
      case "MESSAGE_US":
        return "Message us to place an order or inquire!";
      case "VISIT_STORE":
        return business.location
          ? `Visit us today in ${business.location}!`
          : "Drop by our store today!";
      case "ORDER_NOW":
        return "Order now while supplies last!";
      case "BOOK_NOW":
        return "Book your slot today!";
      case "LEARN_MORE":
        return "Send us a DM for details and reservations.";
    }
  }
  if (business.delivery)
    return `Message us to order for pickup or ${business.delivery}.`;
  if (business.location) return `Drop by ${business.location} today!`;
  return "Send us a direct message to learn more.";
}

const GOAL_LABELS: Record<CampaignGoal, string> = {
  PROMOTE_PRODUCT: "Promote a Product",
  GET_MORE_ORDERS: "Get More Orders",
  GET_STORE_VISITS: "Get Store Visits",
  ANNOUNCEMENT: "Make an Announcement",
  NEW_PRODUCT: "New Product Arrival",
  PROMOTION: "Special Offer / Promotion",
  KEEP_PAGE_ACTIVE: "Keep Page Active",
};

/**
 * Generates tailored platform captions.
 */
function buildPlatformCaptions(
  product: MarketingAssistantContext["products"][number],
  business: MarketingAssistantContext["business"],
  brandProfile: MarketingAssistantContext["brandProfile"],
  goal: CampaignGoal,
  promotion: string,
  duration: string,
  instructions: string
): Record<Platform, string> {
  const price = formatPrice(product.promoPrice ?? product.price);
  const originalPrice = product.promoPrice
    ? formatPrice(product.price)
    : null;
  const promoText = promotion
    ? `\n✨ Special Offer: ${promotion}${duration ? ` (${duration})` : ""}!`
    : "";
  const locationText = business.location
    ? `📍 Visit us: ${business.name}, ${business.location}`
    : `📍 Find us at ${business.name}`;
  const cta = getCallToAction({ business, brandProfile });
  const brandTag = `#${business.name.replace(/[^A-Za-z0-9]/g, "")}`;
  const isTaglish = business.preferredLanguage === "TAGLISH";

  // Facebook: Warm, friendly, story-driven, community focused
  const fbOpening =
    goal === "NEW_PRODUCT"
      ? isTaglish
        ? `May bago tayong treat para sa inyo! Meet our ${product.name}! ✨`
        : `Introducing something fresh: our new ${product.name}! ✨`
      : goal === "ANNOUNCEMENT"
      ? isTaglish
        ? `Exciting update mula sa ${business.name}! ✨`
        : `Special announcement from ${business.name}! ✨`
      : isTaglish
      ? `Tara na sa ${business.name}! Our ${product.name} is waiting for you. ✨`
      : `Stop by ${business.name} for our ${product.name}. ✨`;

  const fbPriceLine = originalPrice
    ? `Available now for only ${price} (regular ${originalPrice})!`
    : `Now available for ${price}.`;

  const facebookCaption = [
    fbOpening,
    "",
    product.description,
    fbPriceLine,
    promoText,
    instructions ? `💡 ${instructions}` : "",
    "",
    locationText,
    business.operatingHours ? `🕒 Operating Hours: ${business.operatingHours}` : "",
    cta,
    "",
    `${brandTag} #SupportLocal #FreshDaily`,
  ]
    .filter(Boolean)
    .join("\n");

  // Instagram: Visual hook, aesthetic spacing, emojis, clean line breaks, tags
  const igHook = isTaglish
    ? `${product.name}, fresh from ${business.name}. ✨`
    : `${product.name}, made at ${business.name}. ✨`;

  const instagramCaption = [
    igHook,
    "",
    `Introducing our ${product.name} · ${price}${promoText ? ` · ${promotion}` : ""}`,
    "",
    product.description ? `“${product.description}”` : "",
    "",
    locationText,
    cta,
    "",
    "· · ·",
    `${brandTag} #SupportLocal #FoodiePH #LocalFavorites #${(product.category || "treats").toLowerCase()}`,
  ]
    .filter(Boolean)
    .join("\n");

  // TikTok: Short video plan + viral hook
  const tiktokCaption = [
    `${product.name} at ${business.name} 👀`,
    `${promotion ? `🔥 ${promotion}! ` : ""}Only ${price}.`,
    locationText,
    cta,
    `${brandTag} #TikTokFood #SupportLocalPH #MustTry`,
    "",
    "🎬 Video Plan for Owner:",
    "1. Hook (0-2s): Quick pour / steam / bite reveal.",
    "2. Body (3-8s): Behind the scenes preparation.",
    "3. Close (9-12s): Show price badge and address on screen.",
  ].join("\n");

  return {
    FACEBOOK: facebookCaption,
    INSTAGRAM: instagramCaption,
    TIKTOK: tiktokCaption,
  };
}

/**
 * Generates bespoke marketing ideas based on business context & catalog.
 */
export function generateMarketingIdeas(
  context: MarketingAssistantContext,
  count = 3
): MarketingIdea[] {
  const { business, products } = context;
  const activeProducts = products.filter((p) => p.availability === "ACTIVE");
  const p1 = activeProducts[0] || {
    id: "default-1",
    name: "Specialty Item",
    category: "Special",
    price: 150,
    description: "Our signature customer favorite.",
  };
  const p2 = activeProducts[1] || p1;

  const nextFriday = nextWeekday(todayKey(), 5);
  const nextSaturday = nextWeekday(todayKey(), 6);

  const allIdeas: MarketingIdea[] = [
    {
      id: "idea-weekend-special",
      title: `Weekend Treat: ${p1.name} Spotlight`,
      category: "PROMOTION",
      summary: `Boost Friday & Saturday foot traffic with a limited-time weekend offer featuring ${p1.name}.`,
      hook: `Your weekend plans just got much sweeter. ☀️`,
      suggestedGoal: "PROMOTION",
      suggestedProductId: p1.id,
      suggestedProductName: p1.name,
      suggestedPromotion: p1.promoPrice
        ? `Promo price ₱${p1.promoPrice}`
        : "15% off for the weekend",
      suggestedDuration: "Friday – Sunday only",
      suggestedPlatforms: ["FACEBOOK", "INSTAGRAM"],
      suggestedDate: nextFriday,
      suggestedTime: "18:00",
      captionPreview: `Weekend plans? Our ${p1.name} is here Friday to Sunday. Tag who you're bringing!`,
    },
    {
      id: "idea-community-craft",
      title: `Behind the Craft: How We Make ${p2.name}`,
      category: "PRODUCT_SPOTLIGHT",
      summary: `Showcase quality and authenticity with a short video or carousel post highlighting ingredients and preparation.`,
      hook: `Ever wondered what makes our ${p2.name} so popular? 👀`,
      suggestedGoal: "PROMOTE_PRODUCT",
      suggestedProductId: p2.id,
      suggestedProductName: p2.name,
      suggestedPromotion: "",
      suggestedDuration: "This week",
      suggestedPlatforms: ["INSTAGRAM", "TIKTOK"],
      suggestedDate: nextSaturday,
      suggestedTime: "11:30",
      captionPreview: `Behind every ${p2.name} is a passion for fresh, honest ingredients. Drop by ${business.location || "our store"} and taste the difference.`,
    },
    {
      id: "idea-orders-push",
      title: `Midweek Recharge: Get More Orders`,
      category: "ENGAGEMENT",
      summary: `Beat the midweek slump by incentivizing direct message orders or delivery to offices and homes.`,
      hook: `Need a quick afternoon boost? We've got you covered. ⚡`,
      suggestedGoal: "GET_MORE_ORDERS",
      suggestedProductId: p1.id,
      suggestedProductName: p1.name,
      suggestedPromotion: "Free delivery on orders above ₱350",
      suggestedDuration: "Wednesday – Thursday",
      suggestedPlatforms: ["FACEBOOK", "INSTAGRAM"],
      suggestedDate: nextWeekday(todayKey(), 3),
      suggestedTime: "13:30",
      captionPreview: `Afternoon slump hitting hard? Message us directly to have your ${p1.name} delivered straight to your door!`,
    },
    {
      id: "idea-page-active",
      title: `Customer Poll: What's Your Favorite Pairing?`,
      category: "ENGAGEMENT",
      summary: `Drive comments and algorithmic reach by asking your community which item they pair with ${p1.name}.`,
      hook: `Quick question for our regulars: What goes best with ${p1.name}? 👇`,
      suggestedGoal: "KEEP_PAGE_ACTIVE",
      suggestedProductId: p1.id,
      suggestedProductName: p1.name,
      suggestedPromotion: "",
      suggestedDuration: "24 hours",
      suggestedPlatforms: ["FACEBOOK", "INSTAGRAM"],
      suggestedDate: todayKey(),
      suggestedTime: "17:00",
      captionPreview: `We're settling the debate once and for all: Team Sweet or Team Savory? Comment your answer below!`,
    },
  ];

  return allIdeas.slice(0, count);
}

/** Fields an intent is allowed to change; unlisted intents may fill everything. */
const SCOPED_FIELDS: Partial<Record<string, string[]>> = {
  captions: ["captions"],
  schedule: ["scheduledDate", "scheduledTime"],
};

/**
 * Intelligent field filling and in-website control engine.
 * Determines what fields in the website to update, builds change notifications,
 * and drafts platform-specific content.
 */
function determineCampaignControl(
  request: MarketingAssistantRequest,
  context: MarketingAssistantContext
): { action?: MarketingCampaignAction; explanation: string } {
  const { business, brandProfile, products } = context;
  const question = request.question.toLocaleLowerCase();
  const currentDraft = request.currentDraft;

  // Detect whether the user wants action/control or just a question
  const isActionIntent =
    request.actionIntent === "fill" ||
    request.actionIntent === "captions" ||
    request.actionIntent === "schedule" ||
    /\b(fill|create|draft|set up|setup|make a campaign|post|schedule|plan a campaign|write a post|start campaign|apply|put together)\b/.test(
      question
    );

  const isIdeasOnly =
    request.actionIntent === "ideas" ||
    (/\b(idea|ideas|brainstorm|suggest|options|what should I|recommendations)\b/.test(
      question
    ) &&
      !/\b(fill|create|make|put into|apply)\b/.test(question));

  // Only touch the owner's campaign when they asked for it. Questions
  // ("how are my posts doing?") get an answer, not a filled-in form.
  if (!isActionIntent || isIdeasOnly) {
    return {
      explanation: "",
    };
  }

  const product = chooseProduct(
    request.question,
    products,
    currentDraft?.productId,
    context.performance?.bestProductName
  );
  if (!product) {
    return {
      explanation:
        "Please add at least one active product in Products & Services so I can fill in the campaign fields for you.",
    };
  }

  // Determine Goal
  let goal: CampaignGoal = "PROMOTE_PRODUCT";
  if (/\b(promo|discount|sale|off|deal|bogo|buy 1|voucher)\b/.test(question)) {
    goal = "PROMOTION";
  } else if (/\b(new|launch|arrival|introducing)\b/.test(question)) {
    goal = "NEW_PRODUCT";
  } else if (/\b(order|delivery|dm to order|takeout)\b/.test(question)) {
    goal = "GET_MORE_ORDERS";
  } else if (/\b(visit|store|foot traffic|drop by|location)\b/.test(question)) {
    goal = "GET_STORE_VISITS";
  } else if (/\b(announce|announcement|hours|holiday|notice)\b/.test(question)) {
    goal = "ANNOUNCEMENT";
  } else if (/\b(active|engagement|poll|question|quiz)\b/.test(question)) {
    goal = "KEEP_PAGE_ACTIVE";
  } else if (currentDraft?.goal) {
    goal = currentDraft.goal as CampaignGoal;
  }

  // Determine Promotion text
  let promotion = currentDraft?.promotion || "";
  const discountMatch = question.match(
    /\b(\d{1,2}%\s*off|buy\s*1\s*get\s*1(?:\s*free)?|free\s+[\w\s]{2,15}|₱\d+[\w\s]{0,10})\b/i
  );
  if (discountMatch) {
    promotion = discountMatch[1];
  } else if (product.promoPrice !== undefined) {
    promotion = `Special Promo: ₱${product.promoPrice} (Save ₱${product.price - product.promoPrice})`;
  } else if (goal === "PROMOTION" && !promotion) {
    promotion = "15% off for this promotion";
  }

  // Determine Duration
  let duration = currentDraft?.duration || "";
  if (/\b(weekend|fri|sat|sun)\b/.test(question)) {
    duration = "Friday – Sunday only";
  } else if (/\b(today|24h|flash)\b/.test(question)) {
    duration = "Today only (Flash deal)";
  } else if (/\b(week|month)\b/.test(question)) {
    duration = "For the whole week";
  } else if (!duration) {
    duration = "This weekend only";
  }

  // Determine Platforms
  let platforms: Platform[] = currentDraft?.platforms?.length
    ? [...currentDraft.platforms]
    : ["FACEBOOK", "INSTAGRAM"];

  if (/\b(instagram only|only ig|just ig)\b/.test(question)) {
    platforms = ["INSTAGRAM"];
  } else if (/\b(facebook only|only fb|just fb)\b/.test(question)) {
    platforms = ["FACEBOOK"];
  } else if (/\b(tiktok|video|reel)\b/.test(question)) {
    if (!platforms.includes("TIKTOK")) platforms.push("TIKTOK");
  }

  // Determine Schedule — the best slot, unless the owner already picked one
  const { slot } = context;
  const wantsNewTime =
    request.actionIntent === "schedule" || /\b(when|best time|schedule)\b/.test(question);
  const keepOwnerTime = !wantsNewTime && Boolean(currentDraft?.scheduledDate);
  const scheduledDate = keepOwnerTime ? currentDraft!.scheduledDate! : nextWeekday(todayKey(), slot.weekday);
  const scheduledTime = keepOwnerTime ? currentDraft?.scheduledTime || slot.time : slot.time;
  const slotReason = slot.fromResults
    ? `Your posts on ${slot.label} have reached the most people so far.`
    : `${slot.label} is a good default until Keh learns from your results.`;

  // Build platform captions
  const instructions =
    currentDraft?.instructions ||
    `Feature ${product.name} in warm light with clear pricing. Emphasize ${business.targetAudience || "local customers"}.`;
  const captions = buildPlatformCaptions(
    product,
    business,
    brandProfile,
    goal,
    promotion,
    duration,
    instructions
  );

  // Build explicit list of field changes to inform user
  const changes: FieldChangeNotification[] = [];

  // 1. Goal change
  const currentGoal = currentDraft?.goal;
  if (!currentGoal || currentGoal !== goal) {
    changes.push({
      field: "goal",
      label: "Campaign Goal",
      oldValue: currentGoal ? GOAL_LABELS[currentGoal as CampaignGoal] : "None",
      newValue: GOAL_LABELS[goal],
      reason: `Selected "${GOAL_LABELS[goal]}" to maximize customer interest for your ${product.name}.`,
    });
  }

  // 2. Product change
  const currentProduct = currentDraft?.productId;
  if (!currentProduct || currentProduct !== product.id) {
    changes.push({
      field: "productId",
      label: "Spotlight Product",
      oldValue: currentProduct
        ? products.find((p) => p.id === currentProduct)?.name || currentProduct
        : "None",
      newValue: `${product.name} (₱${product.promoPrice ?? product.price})`,
      reason: `Selected active catalog item "${product.name}" with confirmed pricing.`,
    });
  }

  // 3. Promotion offer
  if (promotion && promotion !== currentDraft?.promotion) {
    changes.push({
      field: "promotion",
      label: "Promotion Offer",
      oldValue: currentDraft?.promotion || "None",
      newValue: promotion,
      reason: `Set an appealing incentive to motivate customers to act now.`,
    });
  }

  // 4. Duration
  if (duration && duration !== currentDraft?.duration) {
    changes.push({
      field: "duration",
      label: "Campaign Duration",
      oldValue: currentDraft?.duration || "None",
      newValue: duration,
      reason: `Added clear timing to create urgency for customer orders.`,
    });
  }

  // 5. Platforms
  const currentPlatformsKey = (currentDraft?.platforms || []).sort().join(",");
  const newPlatformsKey = [...platforms].sort().join(",");
  if (newPlatformsKey !== currentPlatformsKey) {
    changes.push({
      field: "platforms",
      label: "Social Platforms",
      oldValue: currentDraft?.platforms?.length
        ? currentDraft.platforms.join(", ")
        : "None",
      newValue: platforms.join(", "),
      reason: `Targeted the highest-converting channels for ${business.name}.`,
    });
  }

  // 6. Captions
  changes.push({
    field: "captions",
    label: "Platform Captions",
    oldValue: currentDraft?.captions?.FACEBOOK ? "Existing draft" : "None",
    newValue: `Generated for ${platforms.join(" & ")}`,
    reason: `Crafted platform-tailored copy using your ${brandProfile?.tone || "warm"} tone and Manila call-to-action.`,
  });

  // 7. Schedule
  if (!currentDraft?.scheduledDate || currentDraft.scheduledDate !== scheduledDate) {
    changes.push({
      field: "scheduledDate",
      label: "Publish Date",
      oldValue: currentDraft?.scheduledDate || "None",
      newValue: scheduledDate,
      reason: slotReason,
    });
  }

  if (!currentDraft?.scheduledTime || currentDraft.scheduledTime !== scheduledTime) {
    changes.push({
      field: "scheduledTime",
      label: "Publish Time",
      oldValue: currentDraft?.scheduledTime || "None",
      newValue: `${scheduledTime} (Asia/Manila)`,
      reason: slotReason,
    });
  }

  const draftUpdates: Partial<CampaignDraft> = {
    goal,
    productId: product.id,
    promotion,
    duration,
    instructions,
    platforms,
    captions,
    scheduledDate,
    scheduledTime,
  };

  // "Polish captions" / "best time" only touch those fields.
  const scoped = SCOPED_FIELDS[request.actionIntent ?? "chat"];
  if (scoped) {
    const scopedUpdates = Object.fromEntries(
      Object.entries(draftUpdates).filter(([key]) => scoped.includes(key))
    ) as Partial<CampaignDraft>;
    return {
      action: {
        type: request.actionIntent === "captions" ? "UPDATE_CAPTIONS" : "FILL_FIELDS",
        summary:
          request.actionIntent === "captions"
            ? `Rewrote your captions for ${product.name}`
            : `Scheduled for ${slot.label}`,
        draftUpdates: scopedUpdates,
        changes: changes.filter((c) => scoped.includes(c.field)),
      },
      explanation: "",
    };
  }

  const action: MarketingCampaignAction = {
    type: "FILL_FIELDS",
    summary: `Configured "${GOAL_LABELS[goal]}" campaign for ${product.name}`,
    draftUpdates,
    suggestedStep: 1, // Advance to Content review step
    changes,
  };

  return {
    action,
    explanation: `I've configured your campaign fields for ${product.name}!`,
  };
}

/**
 * Creates a thorough, guided marketing manager response.
 */
function createGuidedMarketingResponse(
  request: MarketingAssistantRequest,
  context: MarketingAssistantContext
): MarketingAssistantResponse {
  const { business, products } = context;
  const question = request.question.trim();
  const normalizedQuestion = question.toLocaleLowerCase();
  const product = chooseProduct(
    question,
    products,
    request.currentDraft?.productId,
    context.performance?.bestProductName
  );

  // If user asked about analytics/metrics — answer from the business's results
  if (
    /\b(analytics|performance|reach|engagement|results|views|clicks|followers|underperform|why did|measure|track|stats|insights|doing|working)\b|how (are|is) my/.test(
      normalizedQuestion
    )
  ) {
    const perf = context.performance;
    const answer = perf
      ? [
          `Here's what your last ${perf.measuredPosts} published posts show:`,
          "",
          ...perf.insights.map((line) => `• ${line}`),
          "",
          perf.bestProductName
            ? `Want me to plan a campaign around ${perf.bestProductName} for ${context.slot.label}?`
            : `Want me to plan your next campaign for ${context.slot.label}?`,
        ]
      : [
          "There aren't results from your published posts yet, so I can't say what's working for you specifically.",
          "",
          "Once your posts go live, Keh tracks reach, interactions and clicks for each one. Compare posts on the same platform and change one thing at a time (format, offer or posting time) to see what made the difference.",
          "",
          "In the meantime, I can draft your next campaign or brainstorm ideas for your products.",
        ];
    return { answer: answer.join("\n"), mode: "guided", ideas: generateMarketingIdeas(context, 3) };
  }

  // Check if this is an idea generation request
  const isIdeaRequest = /\b(idea|ideas|brainstorm|what should i post|suggest|inspire|options)\b/.test(
    normalizedQuestion
  );

  const { action } = determineCampaignControl(request, context);
  const ideas = generateMarketingIdeas(context, 3);

  // Build informing text
  if (action && action.changes.length > 0 && request.actionIntent === "captions") {
    return {
      answer: `I rewrote your captions for ${product?.name || "your product"}. Check each platform tab and tweak anything that doesn't sound like you.`,
      mode: "guided",
      action,
    };
  }
  if (action && action.changes.length > 0 && request.actionIntent === "schedule") {
    const date = action.draftUpdates?.scheduledDate;
    const time = action.draftUpdates?.scheduledTime;
    return {
      answer: [
        `I set your post for ${date ? formatDateKey(date) : "your next best slot"}${time ? ` at ${time}` : ""} (Manila time).`,
        "",
        action.changes[0]?.reason ?? "",
      ].join("\n").trim(),
      mode: "guided",
      action,
    };
  }
  if (action && action.changes.length > 0) {
    const changesList = action.changes
      .map(
        (c) =>
          `• **${c.label}**: ${Array.isArray(c.newValue) ? c.newValue.join(", ") : c.newValue} (${c.reason})`
      )
      .join("\n");

    const answerLines = [
      `I've taken the wheel and filled in the campaign fields for **${product?.name || "your product"}**! 🚀`,
      "",
      "### Here are the changes I made to your in-website posting process:",
      changesList,
      "",
      product?.promoPrice !== undefined
        ? `*Note: Applied promo price ₱${product.promoPrice} from your catalog.*`
        : "",
      "All fields are pre-filled in your Campaign Wizard. You can review the copy, make any edits, or proceed directly to scheduling!",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      answer: answerLines,
      mode: "guided",
      action,
      ideas,
    };
  }

  // If asking for ideas
  if (isIdeaRequest) {
    const ideasText = ideas
      .map(
        (idea, idx) =>
          `**${idx + 1}. ${idea.title}**\n` +
          `• *Hook*: "${idea.hook}"\n` +
          `• *Strategy*: ${idea.summary}\n` +
          `• *Channels*: ${idea.suggestedPlatforms.join(" + ")} · ${idea.suggestedDuration || "Flexible"}`
      )
      .join("\n\n");

    return {
      answer: [
        `Here are 3 high-impact marketing campaign ideas tailored for **${business.name}**:`,
        "",
        ideasText,
        "",
        "💡 **Next Step**: Click any idea below or tell me which one you like, and I'll immediately fill in the campaign fields and captions for you!",
      ].join("\n"),
      mode: "guided",
      ideas,
    };
  }

  // General marketing advice fallback
  const audience = business.targetAudience || "your local customers";
  const callToAction = getCallToAction(context);
  const price = product ? product.promoPrice ?? product.price : 0;

  return {
    answer: [
      `Recommended next marketing move for **${business.name}**: feature **${product?.name || "your top product"}** for ${audience}.`,
      "",
      `• **Creative Angle**: Lead with an authentic customer moment and show the real ₱${price} price point.`,
      `• **Format**: Short preparation video or carousel post.`,
      `• **Timing**: ${context.slot.label}${context.slot.fromResults ? " (your best-performing time)" : ""}.`,
      `• **Call to Action**: ${callToAction}`,
      "",
      "Would you like me to fill out a campaign with this strategy right now? Just let me know or click one of the ideas below!",
    ].join("\n"),
    mode: "guided",
    ideas,
  };
}

const PLATFORM_VALUES = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];
const GOAL_VALUES = Object.keys(GOAL_LABELS);

/**
 * The reply's shape, sent as structured output (Gemini responseJsonSchema /
 * OpenAI json_schema) instead of being spelled out in every prompt. Kept
 * loose on purpose: StructuredResultSchema and sanitizeResponse still check
 * every reply.
 */
const CHAT_REPLY_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "Plain text for the owner, under 180 words. Short paragraphs or lines starting with •. No markdown.",
    },
    ideas: {
      type: "array",
      description: "Only when brainstorming: 2-3 ideas.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "short-kebab-id" },
          title: { type: "string" },
          category: { type: "string", enum: ["PROMOTION", "PRODUCT_SPOTLIGHT", "ENGAGEMENT", "SEASONAL", "ANNOUNCEMENT"] },
          summary: { type: "string" },
          hook: { type: "string" },
          suggestedGoal: { type: "string", enum: GOAL_VALUES },
          suggestedProductId: { type: "string", description: "An id from products" },
          suggestedProductName: { type: "string" },
          suggestedPromotion: { type: "string" },
          suggestedDuration: { type: "string" },
          suggestedPlatforms: { type: "array", items: { type: "string", enum: PLATFORM_VALUES } },
          suggestedDate: { type: "string", description: "YYYY-MM-DD" },
          suggestedTime: { type: "string", description: "HH:MM, 24-hour" },
          captionPreview: { type: "string" },
        },
        required: ["id", "title", "category", "summary", "hook", "suggestedGoal", "suggestedPlatforms"],
      },
    },
    action: {
      type: "object",
      description: "Only when the owner asks you to create, fill, write, rewrite or schedule something.",
      properties: {
        type: { type: "string", enum: ["FILL_FIELDS", "UPDATE_CAPTIONS"] },
        summary: { type: "string", description: "One line, e.g. Set up a weekend promo for Matcha Latte" },
        draftUpdates: {
          type: "object",
          description: "ONLY the fields you change.",
          properties: {
            goal: { type: "string", enum: GOAL_VALUES },
            productId: { type: "string", description: "An id from products" },
            promotion: { type: "string" },
            duration: { type: "string" },
            instructions: { type: "string" },
            platforms: { type: "array", items: { type: "string", enum: PLATFORM_VALUES } },
            captions: {
              type: "object",
              description: "One caption per selected platform.",
              properties: {
                FACEBOOK: { type: "string" },
                INSTAGRAM: { type: "string" },
                TIKTOK: { type: "string" },
              },
            },
            scheduledDate: { type: "string", description: "YYYY-MM-DD" },
            scheduledTime: { type: "string", description: "HH:MM, 24-hour Manila time" },
          },
        },
        suggestedStep: {
          type: "integer",
          description: "Wizard step to show: 0 goal, 1 content, 2 platforms, 3 review, 4 publish",
        },
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", description: "The draftUpdates key" },
              label: { type: "string" },
              oldValue: { type: "string" },
              newValue: { type: "string" },
              reason: { type: "string", description: "Why, in one sentence" },
            },
            required: ["field", "label", "newValue", "reason"],
          },
        },
      },
      required: ["type", "summary", "draftUpdates", "changes"],
    },
  },
  required: ["answer"],
};

/** The slice of the business context a prompt includes. */
type PromptContext = Pick<MarketingAssistantContext, "business" | "brandProfile" | "performance"> & {
  products: Partial<MarketingAssistantContext["products"][number]>[];
  recentCaptions?: string[];
};

/**
 * Only what this intent needs. Rewriting captions sends just the draft's
 * product (in full) and the recent captions to avoid repeating; filling a
 * campaign sends every active product with short descriptions; chat and
 * ideas send shorter descriptions still and no captions.
 */
function promptContext(request: MarketingAssistantRequest, context: MarketingAssistantContext): PromptContext {
  const intent = request.actionIntent ?? "chat";
  const active = context.products.filter((p) => p.availability === "ACTIVE");
  const draftProduct = active.find((p) => p.id === request.currentDraft?.productId);
  const writesCaptions = intent === "fill" || intent === "captions";

  const products =
    intent === "captions" && draftProduct
      ? [draftProduct]
      : active.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          promoPrice: p.promoPrice,
          category: p.category,
          description: clip(p.description, writesCaptions ? 200 : 120),
          ...(p.aiNotes && { aiNotes: clip(p.aiNotes, writesCaptions ? 150 : 100) }),
        }));

  return {
    business: context.business,
    brandProfile: context.brandProfile,
    products,
    performance: context.performance,
    ...(writesCaptions && { recentCaptions: (context.recentCaptions ?? []).map((c) => clip(c, 200)) }),
  };
}

/** The wizard draft as the model sees it: captions only when rewriting them. */
function draftForPrompt(request: MarketingAssistantRequest) {
  const { captions, ...rest } = request.currentDraft ?? {};
  if (request.actionIntent !== "captions" || !captions) return rest;
  const platforms = rest.platforms?.length ? rest.platforms : (Object.keys(captions) as Platform[]);
  return {
    ...rest,
    captions: Object.fromEntries(
      platforms.filter((p) => captions[p]).map((p) => [p, clip(captions[p]!, 1000)])
    ),
  };
}

function createSystemPrompt(context: PromptContext, slot: PostingSlot): string {
  const today = todayKey();
  return [
    "You are Keh, a warm, practical marketing manager for a small business in the Philippines. The owner makes business decisions; you handle the marketing: ideas, captions, platforms and timing.",
    `Today is ${formatDateKey(today)} (${today}), Asia/Manila time.`,
    "Reply with one JSON object that follows the response schema. Leave out ideas and action unless the owner's request calls for them.",
    "",
    "Rules:",
    "- Every field in draftUpdates must have a matching entry in changes, so the owner sees exactly what you changed.",
    "- productId / suggestedProductId must be an id from the products list. Never invent products or prices.",
    "- Only add a promotion if the owner asked for one or the product has a promoPrice. Don't promise discounts the owner didn't approve.",
    "- Dates are today or later (YYYY-MM-DD); times are 24-hour HH:MM Manila time. Prefer the recommended posting slot below.",
    "- Captions: one per selected platform, in the business's preferred language and brand tone, ending with the business's call to action. Facebook: warm and story-led. Instagram: short lines, a few hashtags. TikTok: a hook line plus a 3-step video plan for the owner.",
    '- If the request intent is "captions", change only captions.',
    "- Keh saves and schedules posts; it does not publish them yet. Never claim a post was published.",
    "",
    "Make it specific to THIS business — generic copy is the main thing to avoid:",
    "- Every caption uses at least two concrete details from the context: the product's description or notes, the exact price (and promo price), the location, opening hours, delivery or payment options, or the target audience.",
    "- Match what's being sold. A beer gets 'ice-cold', pulutan and barkada nights (and ends with 'Drink responsibly.'); coffee gets the pour and the study break; a salon gets the before/after. Never call a drink or service a 'treat' unless it is one.",
    "- Don't use filler phrases like: 'treat yourself', 'your next favorite', 'don't miss out', 'look no further', 'elevate', 'indulge', 'something special', 'made with love', 'the wait is over', 'you deserve it'.",
    "- Use local timing when it fits the date: payday (15th and 30th / 'sweldo'), ber months and Christmas, weekends, rainy season, summer.",
    "- The owner's instructions are a brief for you — follow them, don't paste them into the caption.",
    "- When recent captions are listed, vary the structure and opening line; never reuse their first lines.",
    "- Ideas must name a real product from the list and say why it fits now (a result, a promo price, a date, a season).",
    "- Only cite performance numbers that appear in the context. If performance is null, say there are no results yet.",
    "",
    `Recommended posting slot: ${slot.label}${slot.fromResults ? " (from this business's results)" : " (default; no results yet)"}, around ${slot.time}.`,
    `Business, brand, products, performance and recent captions:\n${JSON.stringify(context)}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanitizing — applied to every response, model or guided
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  goal: "Campaign Goal",
  productId: "Spotlight Product",
  promotion: "Promotion Offer",
  duration: "Campaign Duration",
  instructions: "Instructions",
  platforms: "Social Platforms",
  captions: "Platform Captions",
  scheduledDate: "Publish Date",
  scheduledTime: "Publish Time",
};

const DATE_RE =/^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Removes markdown emphasis/headings; the chat UI shows plain text. */
function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[\s•(])\*(\S[^*\n]*?)\*/g, "$1$2")
    .replace(/^#{1,6}\s*/gm, "");
}

function sanitizeResponse(
  response: MarketingAssistantResponse,
  context: MarketingAssistantContext
): MarketingAssistantResponse {
  const today = todayKey();
  const activeIds = new Set(
    context.products.filter((p) => p.availability === "ACTIVE").map((p) => p.id)
  );
  const validDate = (d?: string) => Boolean(d && DATE_RE.test(d) && d >= today);
  const validTime = (t?: string) => Boolean(t && TIME_RE.test(t));

  const ideas = response.ideas?.slice(0, 4).map((idea): MarketingIdea => {
    const knownProduct = idea.suggestedProductId && activeIds.has(idea.suggestedProductId);
    const platforms = [...new Set(idea.suggestedPlatforms)];
    return {
      ...idea,
      title: clip(plainText(idea.title), 120),
      summary: clip(plainText(idea.summary), 400),
      hook: clip(plainText(idea.hook), 200),
      suggestedProductId: knownProduct ? idea.suggestedProductId : undefined,
      suggestedProductName: knownProduct ? idea.suggestedProductName : undefined,
      suggestedPlatforms: platforms.length ? platforms : ["FACEBOOK", "INSTAGRAM"],
      suggestedDate: validDate(idea.suggestedDate) ? idea.suggestedDate : undefined,
      suggestedTime: validTime(idea.suggestedTime) ? idea.suggestedTime : undefined,
      captionPreview: idea.captionPreview ? clip(idea.captionPreview, 600) : undefined,
    };
  });

  let action = response.action;
  if (action?.draftUpdates) {
    const u: Partial<CampaignDraft> = { ...action.draftUpdates };
    if (u.productId !== undefined && !activeIds.has(u.productId)) delete u.productId;
    if (u.scheduledDate !== undefined && !validDate(u.scheduledDate)) delete u.scheduledDate;
    if (u.scheduledTime !== undefined && !validTime(u.scheduledTime)) delete u.scheduledTime;
    if (u.platforms) {
      u.platforms = [...new Set(u.platforms)];
      if (u.platforms.length === 0) delete u.platforms;
    }
    if (u.captions) {
      const captions = Object.fromEntries(
        Object.entries(u.captions)
          .filter(([, text]) => typeof text === "string" && text.trim())
          .map(([platform, text]) => [platform, clip(text!.trim(), 2200)])
      );
      if (Object.keys(captions).length) u.captions = captions;
      else delete u.captions;
    }
    if (u.promotion !== undefined) u.promotion = clip(u.promotion, 120);
    if (u.duration !== undefined) u.duration = clip(u.duration, 120);
    if (u.instructions !== undefined) u.instructions = clip(u.instructions, 1000);

    const kept = new Set(Object.keys(u));
    const changes: FieldChangeNotification[] = action.changes
      .filter((c) => kept.has(c.field))
      .slice(0, 12)
      .map((c) => ({ ...c, reason: clip(plainText(c.reason), 300) }));
    // The owner must see every field that changed, even if the model didn't list it.
    for (const field of kept) {
      if (changes.some((c) => c.field === field)) continue;
      const value = u[field as keyof CampaignDraft];
      changes.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        newValue: Array.isArray(value)
          ? value.map(String)
          : typeof value === "object" && value
            ? `Updated for ${Object.keys(value).join(", ")}`
            : String(value ?? ""),
        reason: "Set by Keh as part of this change.",
      });
    }
    action =
      kept.size > 0
        ? {
            ...action,
            summary: clip(plainText(action.summary), 160),
            draftUpdates: u,
            changes,
            suggestedStep:
              typeof action.suggestedStep === "number"
                ? Math.min(Math.max(action.suggestedStep, 0), 4)
                : undefined,
          }
        : undefined;
  } else {
    action = undefined;
  }

  return {
    answer: clip(plainText(response.answer).trim(), 4000),
    mode: response.mode,
    ...(action && { action }),
    ...(ideas?.length && { ideas }),
  };
}

/** Chat questions about results; see usesModel. */
const PERFORMANCE_QUESTION = /\b(analytics|performance|stats|insights)\b|\bhow (are|is) my\b/i;
/** History sent to the model: the last few turns, trimmed. */
const HISTORY_TURNS = 4;
const HISTORY_CHARS = 800;

/**
 * Whether a request needs the language model. The best posting time is
 * computed from the business's results (context.slot), and results
 * questions may only cite numbers already in the context, so the guided
 * engine answers both at no cost.
 */
export function usesModel(request: MarketingAssistantRequest): boolean {
  if (!activeProvider()) return false;
  const intent = request.actionIntent ?? "chat";
  if (intent === "schedule") return false;
  if (intent === "chat" && PERFORMANCE_QUESTION.test(request.question)) return false;
  return true;
}

export async function generateMarketingAdvice(
  request: MarketingAssistantRequest,
  context: MarketingAssistantContext,
  { allowModel = true }: { allowModel?: boolean } = {}
): Promise<MarketingAssistantResponse> {
  const guided = () => sanitizeResponse(createGuidedMarketingResponse(request, context), context);
  if (!allowModel || !usesModel(request)) return guided();

  const intent = request.actionIntent ?? "chat";
  const writesCaptions = intent === "fill" || intent === "captions";
  const text = await generateJson(
    createSystemPrompt(promptContext(request, context), context.slot),
    [
      ...request.history
        .slice(-HISTORY_TURNS)
        .map((turn) => ({ ...turn, content: clip(turn.content, HISTORY_CHARS) })),
      {
        role: "user",
        content: [
          request.question,
          "",
          `Request intent: ${intent}`,
          `Current wizard step: ${request.currentStep ?? "not in the wizard"}`,
          `Current draft: ${JSON.stringify(draftForPrompt(request))}`,
        ].join("\n"),
      },
    ],
    {
      label: `chat:${intent}`,
      // Room for three captions (or a few ideas) plus low-level thinking.
      maxOutputTokens: writesCaptions ? 2048 : 1536,
      schema: { name: "keh_reply", schema: CHAT_REPLY_SCHEMA },
    }
  );
  if (!text) return guided();

  try {
    // Some models wrap JSON in a ```json fence despite being told not to.
    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const structured = StructuredResultSchema.safeParse(stripNulls(JSON.parse(json)));
    if (!structured.success) {
      console.warn("The model returned an unexpected shape; using guided mode.", structured.error.issues[0]);
      return guided();
    }

    const { answer, ideas: rawIdeas = [], action: rawAction } = structured.data;
    const ideas = rawIdeas.flatMap((idea) => {
      const parsedIdea = MarketingIdeaSchema.safeParse(idea);
      return parsedIdea.success ? [parsedIdea.data] : [];
    });
    const action = rawAction === undefined ? undefined : LenientActionSchema.safeParse(rawAction);
    if (action && !action.success) {
      console.warn("The model returned an unusable campaign action; keeping the answer only.", action.error.issues[0]);
    }

    return sanitizeResponse(
      { answer, ideas, action: action?.success ? action.data : undefined, mode: "ai" },
      context
    );
  } catch (error) {
    console.warn("The model's reply wasn't valid JSON; using guided mode.", error);
    return guided();
  }
}
