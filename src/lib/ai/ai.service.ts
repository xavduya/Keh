import type {
  BrandProfile,
  Business,
  CampaignDraft,
  CampaignGoal,
  FieldChangeNotification,
  MarketingCampaignAction,
  MarketingIdea,
  Platform,
  Product,
} from "@/types";
import type { MarketingAssistantRequestSchema } from "@/lib/validation/schemas";
import { formatPrice } from "@/utils";
import { nextWeekday, todayKey } from "@/utils/datetime";
import { z } from "zod";

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
}

export interface MarketingAssistantResponse {
  answer: string;
  mode: "openai" | "guided";
  action?: MarketingCampaignAction;
  ideas?: MarketingIdea[];
}

const OpenAIResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable(),
      }),
    })
  ),
});

const StructuredOpenAIResultSchema = z.object({
  answer: z.string(),
  ideas: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        category: z.enum([
          "PROMOTION",
          "PRODUCT_SPOTLIGHT",
          "ENGAGEMENT",
          "SEASONAL",
          "ANNOUNCEMENT",
        ]),
        summary: z.string(),
        hook: z.string(),
        suggestedGoal: z.enum([
          "PROMOTE_PRODUCT",
          "GET_MORE_ORDERS",
          "GET_STORE_VISITS",
          "ANNOUNCEMENT",
          "NEW_PRODUCT",
          "PROMOTION",
          "KEEP_PAGE_ACTIVE",
        ]),
        suggestedProductId: z.string().optional(),
        suggestedProductName: z.string().optional(),
        suggestedPromotion: z.string().optional(),
        suggestedDuration: z.string().optional(),
        suggestedPlatforms: z.array(
          z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"])
        ),
        suggestedDate: z.string().optional(),
        suggestedTime: z.string().optional(),
        captionPreview: z.string().optional(),
      })
    )
    .optional(),
  action: z
    .object({
      type: z.enum([
        "FILL_FIELDS",
        "UPDATE_CAPTIONS",
        "NAVIGATE_STEP",
        "SUGGEST_IDEAS",
      ]),
      summary: z.string(),
      draftUpdates: z
        .object({
          goal: z
            .enum([
              "PROMOTE_PRODUCT",
              "GET_MORE_ORDERS",
              "GET_STORE_VISITS",
              "ANNOUNCEMENT",
              "NEW_PRODUCT",
              "PROMOTION",
              "KEEP_PAGE_ACTIVE",
              "",
            ])
            .optional(),
          productId: z.string().optional(),
          promotion: z.string().optional(),
          duration: z.string().optional(),
          instructions: z.string().optional(),
          scheduledDate: z.string().optional(),
          scheduledTime: z.string().optional(),
          platforms: z
            .array(z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]))
            .optional(),
          captions: z
            .object({
              FACEBOOK: z.string().optional(),
              INSTAGRAM: z.string().optional(),
              TIKTOK: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      suggestedStep: z.number().int().min(0).max(4).optional(),
      changes: z.array(
        z.object({
          field: z.string(),
          label: z.string(),
          oldValue: z
            .union([z.string(), z.array(z.string()), z.null()])
            .optional(),
          newValue: z.union([z.string(), z.array(z.string())]),
          reason: z.string(),
        })
      ),
    })
    .optional(),
});

function chooseProduct(
  question: string,
  products: MarketingAssistantContext["products"],
  currentProductId?: string
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

  // Next, pick product on promo:
  const promoProduct = availableProducts.find(
    (p) => p.promoPrice !== undefined
  );
  if (promoProduct) return promoProduct;

  return availableProducts[0];
}

function getCallToAction(context: MarketingAssistantContext): string {
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
  const cta = getCallToAction({ business, brandProfile, products: [product] });
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
      ? `Craving something special today? Tara, treat yourself to our ${product.name}! ☕✨`
      : `Looking for your next favorite treat? Discover our ${product.name}. ✨`;

  const fbPriceLine = originalPrice
    ? `Available now for only ${price} (regular ${originalPrice})!`
    : `Now available for ${price}.`;

  const facebookCaption = [
    fbOpening,
    "",
    product.description || `Freshly crafted with love just for you.`,
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
    ? `Your daily dose of happiness is served. 🌿✨`
    : `The highlight of your week starts right here. ✨`;

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
    `POV: You finally tried the famous ${product.name} at ${business.name} 😍`,
    `${promotion ? `🔥 ${promotion}!` : ""} Treat yourself for ${price}!`,
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
      captionPreview: `Weekend countdown is on! Treat yourself to our ${p1.name} this Friday to Sunday. Tag someone who owes you a treat!`,
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

  if (!isActionIntent && isIdeasOnly) {
    return {
      explanation: "",
    };
  }

  const product = chooseProduct(
    request.question,
    products,
    currentDraft?.productId
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

  // Determine Schedule
  const defaultDate = nextWeekday(todayKey(), 5); // Friday
  const scheduledDate =
    currentDraft?.scheduledDate && currentDraft.scheduledDate !== ""
      ? currentDraft.scheduledDate
      : defaultDate;
  const scheduledTime = currentDraft?.scheduledTime || "18:00";

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
      reason: `Scheduled for Friday evening when small business engagement peaks in Asia/Manila.`,
    });
  }

  if (!currentDraft?.scheduledTime || currentDraft.scheduledTime !== scheduledTime) {
    changes.push({
      field: "scheduledTime",
      label: "Publish Time",
      oldValue: currentDraft?.scheduledTime || "None",
      newValue: `${scheduledTime} (Asia/Manila)`,
      reason: `Picked 6:00 PM for optimal after-work viewing.`,
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

  const action: MarketingCampaignAction = {
    type: "FILL_FIELDS",
    summary: `Configured "${GOAL_LABELS[goal]}" campaign for ${product.name}`,
    draftUpdates,
    suggestedStep: 1, // Advance to Content review step
    changes,
  };

  return {
    action,
    explanation: `I've configured your campaign fields for **${product.name}**!`,
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
    request.currentDraft?.productId
  );

  // If user asked about analytics/metrics
  if (
    /\b(analytics|performance|reach|engagement|results|views|clicks|followers|underperform|why did|measure|track)\b/.test(
      normalizedQuestion
    )
  ) {
    return {
      answer: [
        "I can't verify live post performance yet—the analytics currently shown in Keh are sample data, not synced results from your social accounts.",
        "",
        "For a useful review once live data is connected, compare posts on the same platform and track reach, interactions, and clicks. Change one variable at a time (format, offer, or posting time) to know what made the impact.",
        "",
        "In the meantime, I can help you draft your next campaign or brainstorm creative marketing ideas for your products!",
      ].join("\n"),
      mode: "guided",
      ideas: generateMarketingIdeas(context, 3),
    };
  }

  // Check if this is an idea generation request
  const isIdeaRequest = /\b(idea|ideas|brainstorm|what should i post|suggest|inspire|options)\b/.test(
    normalizedQuestion
  );

  const { action } = determineCampaignControl(request, context);
  const ideas = generateMarketingIdeas(context, 3);

  // Build informing text
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
      `• **Timing**: Friday at 6:00 PM for maximum evening social engagement.`,
      `• **Call to Action**: ${callToAction}`,
      "",
      "Would you like me to fill out a campaign with this strategy right now? Just let me know or click one of the ideas below!",
    ].join("\n"),
    mode: "guided",
    ideas,
  };
}

function createSystemPrompt(context: MarketingAssistantContext): string {
  return [
    "You are Keh, an elite, proactive, and thoughtful marketing manager for small business owners.",
    "Your goal is to handle giving creative, strategic marketing ideas AND to take direct control of the in-website process of posting content by generating structured field updates for the campaign wizard.",
    "",
    "When asked to create, draft, fill, or schedule content, you MUST provide structured field updates in the 'action' object and inform the user of every change made.",
    "Fields you control in the campaign wizard:",
    "- goal: 'PROMOTE_PRODUCT' | 'GET_MORE_ORDERS' | 'GET_STORE_VISITS' | 'ANNOUNCEMENT' | 'NEW_PRODUCT' | 'PROMOTION' | 'KEEP_PAGE_ACTIVE'",
    "- productId: exact ID of a product from the context products list",
    "- promotion: string offer e.g. '15% off this weekend' or 'Buy 1 Get 1 free'",
    "- duration: string e.g. 'Friday – Sunday only'",
    "- instructions: string creative brief",
    "- platforms: array of ['FACEBOOK', 'INSTAGRAM', 'TIKTOK']",
    "- captions: object with platform keys (FACEBOOK, INSTAGRAM, TIKTOK)",
    "- scheduledDate: YYYY-MM-DD",
    "- scheduledTime: HH:mm",
    "- changes: array of { field, label, oldValue, newValue, reason } detailing every single change you made.",
    "",
    "You also provide 2-3 marketing ideas in the 'ideas' array with catchy hooks, angles, and suggested parameters.",
    "Be warm, realistic, concise, and encourage small business owners. Use the business's location, language preferences (Taglish / English), and brand details accurately.",
    "Return JSON format matching the schema.",
    `Business and product context:\n${JSON.stringify(context)}`,
  ].join("\n\n");
}

export async function generateMarketingAdvice(
  request: MarketingAssistantRequest,
  context: MarketingAssistantContext
): Promise<MarketingAssistantResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createGuidedMarketingResponse(request, context);
  }

  try {
    const messages = [
      { role: "system", content: createSystemPrompt(context) },
      ...request.history.map(({ role, content }) => ({ role, content })),
      {
        role: "user",
        content: `${request.question}\n\nCurrent Draft Context: ${JSON.stringify(request.currentDraft || {})}`,
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(
        `OpenAI request failed with status ${response.status}, falling back to guided mode.`
      );
      return createGuidedMarketingResponse(request, context);
    }

    const rawData = await response.json();
    const parsed = OpenAIResponseSchema.safeParse(rawData);
    if (!parsed.success) {
      return createGuidedMarketingResponse(request, context);
    }

    const content = parsed.data.choices[0]?.message.content?.trim();
    if (!content) {
      return createGuidedMarketingResponse(request, context);
    }

    const structured = StructuredOpenAIResultSchema.safeParse(
      JSON.parse(content)
    );
    if (!structured.success) {
      // If JSON structure wasn't 100% matched, fallback to guided
      return createGuidedMarketingResponse(request, context);
    }

    return {
      answer: structured.data.answer,
      mode: "openai",
      action: structured.data.action as MarketingCampaignAction,
      ideas: structured.data.ideas as MarketingIdea[],
    };
  } catch (error) {
    console.error("OpenAI call failed, seamlessly falling back to guided engine:", error);
    return createGuidedMarketingResponse(request, context);
  }
}
