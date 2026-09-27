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

export const BrandFormSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().default(""),
  industry: z.string().default(""),
  location: z.string().default(""),
  operatingHours: z.string().default(""),
  phone: z.string().default(""),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  delivery: z.string().default(""),
  payment: z.string().default(""),
  targetAudience: z.string().default(""),
  audienceAgeGroup: z.string().default(""),
  audienceInterests: z.string().default(""),
  tone: z.string().default("FRIENDLY"),
  preferredLanguage: z.string().default("TAGLISH"),
  defaultCTA: z.string().default("MESSAGE_US"),
  brandColor: z.string().default("#5849da"),
  brandGuidelines: z.string().default(""),
});

export type BrandFormValues = z.infer<typeof BrandFormSchema>;
