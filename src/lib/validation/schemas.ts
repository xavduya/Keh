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

export const CampaignDraftSchema = z.object({
  goal: CampaignGoalSchema.or(z.literal("")),
  productId: z.string().min(1, "Select a product"),
  promotion: z.string().default(""),
  duration: z.string().default(""),
  instructions: z.string().default(""),
  scheduledDate: z.string().min(1, "Choose a date"),
  scheduledTime: z.string().min(1, "Choose a time"),
  platforms: z
    .array(PlatformSchema)
    .min(1, "Choose at least one platform"),
  captions: z.record(z.string(), z.string()),
});

// ─────────────────────────────────────────────────────────────────────────────
// Form schemas  (subset of domain schemas, used for react-hook-form + Zod)
// ─────────────────────────────────────────────────────────────────────────────

export const ProductFormSchema = ProductSchema.pick({
  name: true,
  description: true,
  price: true,
  promoPrice: true,
  category: true,
  availability: true,
  aiNotes: true,
}).extend({
  productUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
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
