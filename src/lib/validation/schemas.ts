/**
 * Zod validation schemas
 *
 * Centralised schema definitions for:
 *  - Form validation
 *  - API request/response validation
 *  - AI structured output validation
 *
 * NOTE: Schemas are stubs. Flesh out in Phase 4 alongside service functions.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Enums (mirror types/index.ts as Zod enums for runtime validation)
// ─────────────────────────────────────────────────────────────────────────────

export const PlatformSchema = z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"]);

export const PostStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "ACTION_REQUIRED",
  "FAILED",
]);

export const CampaignGoalSchema = z.enum([
  "PROMOTE_PRODUCT",
  "GET_MORE_ORDERS",
  "GET_STORE_VISITS",
  "ANNOUNCEMENT",
  "NEW_PRODUCT",
  "PROMOTION",
  "KEEP_PAGE_ACTIVE",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Domain object schemas
// ─────────────────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().default(""),
  price: z.number().min(0, "Price must be a positive number"),
  promoPrice: z.number().min(0).optional(),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().url().or(z.string().startsWith("data:")),
  productUrl: z.string().url().optional().or(z.literal("")),
  availability: z.enum(["ACTIVE", "UNAVAILABLE"]),
  aiNotes: z.string().optional(),
});

/** Campaign wizard draft, validated on the server before saving. */
export const CampaignDraftSchema = z.object({
  goal: z.enum(CampaignGoalSchema.options, { error: "Choose a goal" }),
  productId: z.string().min(1, "Select a product"),
  promotion: z.string().trim().max(120).default(""),
  duration: z.string().trim().max(120).default(""),
  instructions: z.string().trim().max(1000).default(""),
  scheduledDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")]),
  scheduledTime: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "Choose a time")]),
  platforms: z.array(PlatformSchema).min(1, "Choose at least one platform"),
  captions: z.partialRecord(PlatformSchema, z.string().trim().max(2200)),
});

export const FieldChangeSchema = z.object({
  field: z.string(),
  label: z.string(),
  oldValue: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  newValue: z.union([z.string(), z.array(z.string())]),
  reason: z.string(),
});

export const MarketingCampaignActionSchema = z.object({
  type: z.enum(["FILL_FIELDS", "UPDATE_CAPTIONS", "NAVIGATE_STEP", "SUGGEST_IDEAS"]),
  summary: z.string(),
  draftUpdates: z
    .object({
      goal: z.union([CampaignGoalSchema, z.literal("")]).optional(),
      productId: z.string().optional(),
      promotion: z.string().optional(),
      duration: z.string().optional(),
      instructions: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      platforms: z.array(PlatformSchema).optional(),
      captions: z.partialRecord(PlatformSchema, z.string()).optional(),
    })
    .optional(),
  suggestedStep: z.number().int().min(0).max(4).optional(),
  changes: z.array(FieldChangeSchema),
});

export const MarketingIdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["PROMOTION", "PRODUCT_SPOTLIGHT", "ENGAGEMENT", "SEASONAL", "ANNOUNCEMENT"]),
  summary: z.string(),
  hook: z.string(),
  suggestedGoal: CampaignGoalSchema,
  suggestedProductId: z.string().optional(),
  suggestedProductName: z.string().optional(),
  suggestedPromotion: z.string().optional(),
  suggestedDuration: z.string().optional(),
  suggestedPlatforms: z.array(PlatformSchema),
  suggestedDate: z.string().optional(),
  suggestedTime: z.string().optional(),
  captionPreview: z.string().optional(),
});

export const MarketingAssistantRequestSchema = z.object({
  question: z.string().trim().min(1, "Ask Keh a question").max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .max(8)
    .default([]),
  currentDraft: z
    .object({
      goal: z.union([CampaignGoalSchema, z.literal("")]).optional(),
      productId: z.string().optional(),
      promotion: z.string().optional(),
      duration: z.string().optional(),
      instructions: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      platforms: z.array(PlatformSchema).optional(),
      captions: z.partialRecord(PlatformSchema, z.string()).optional(),
    })
    .optional(),
  currentStep: z.number().int().min(0).max(4).optional(),
  actionIntent: z.enum(["chat", "ideas", "fill", "captions", "schedule"]).optional(),
});

export const MarketingAssistantResponseSchema = z.object({
  answer: z.string(),
  mode: z.enum(["ai", "guided"]),
  action: MarketingCampaignActionSchema.optional(),
  ideas: z.array(MarketingIdeaSchema).optional(),
});


// ─────────────────────────────────────────────────────────────────────────────
// Form schemas  (subset of domain schemas, used for react-hook-form + Zod)
// ─────────────────────────────────────────────────────────────────────────────

/** Empty form inputs arrive as "" — treat them as "not provided". */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** Product add/edit form. Parses raw FormData values (all strings). */
export const ProductFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120),
  description: z.string().trim().max(1000).default(""),
  price: z.preprocess(
    emptyToUndefined,
    z.coerce.number({ error: "Enter a price" }).min(0, "Price can't be negative")
  ),
  promoPrice: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0, "Promo price can't be negative").optional()
  ),
  category: z.string().trim().max(60).default(""),
  availability: z.enum(["ACTIVE", "UNAVAILABLE"]).default("ACTIVE"),
  aiNotes: z.string().trim().max(1000).default(""),
  productUrl: z
    .union([z.literal(""), z.url({ error: "Enter a valid URL, e.g. https://…" })])
    .default(""),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;

/** Brand profile form (business details + brand voice). Parses raw FormData. */
export const BrandFormSchema = z.object({
  // Business information
  name: z.string().trim().min(1, "Business name is required").max(120),
  description: z.string().trim().max(1000).default(""),
  industry: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  operatingHours: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(40).default(""),
  website: z
    .union([z.literal(""), z.url({ error: "Enter a valid URL, e.g. https://…" })])
    .default(""),
  delivery: z.string().trim().max(200).default(""),
  payment: z.string().trim().max(200).default(""),
  // Audience
  targetAudience: z.string().trim().max(200).default(""),
  audienceAgeGroup: z.string().trim().max(60).default(""),
  audienceInterests: z.string().trim().max(200).default(""),
  // Brand voice & identity
  tone: z.enum(["FRIENDLY", "PROFESSIONAL", "CASUAL", "ENERGETIC", "PREMIUM", "FUNNY", "INFORMATIVE"]),
  preferredLanguage: z.enum(["ENGLISH", "FILIPINO", "TAGLISH", "CEBUANO", "MIXED"]),
  defaultCTA: z.enum(["MESSAGE_US", "VISIT_STORE", "ORDER_NOW", "BOOK_NOW", "LEARN_MORE"]),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a color")
    .default("#5849da"),
  brandGuidelines: z.string().trim().max(2000).default(""),
});

export type BrandFormValues = z.infer<typeof BrandFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding (a few fields per step; the brand page edits the rest)
// ─────────────────────────────────────────────────────────────────────────────

export const OnboardingBusinessSchema = BrandFormSchema.pick({
  name: true,
  industry: true,
  location: true,
  description: true,
  targetAudience: true,
});

export const OnboardingBrandSchema = BrandFormSchema.pick({
  tone: true,
  preferredLanguage: true,
  defaultCTA: true,
  brandColor: true,
});
