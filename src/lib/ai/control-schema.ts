import { z } from "zod";

export const DashboardPageSchema = z.enum(["/dashboard", "/assistant", "/products", "/campaigns", "/campaigns/new", "/calendar", "/content", "/analytics", "/brand", "/subscription", "/settings", "/social-accounts"]);
const productFields = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().min(0).optional(),
  promoPrice: z.number().min(0).nullable().optional(),
  category: z.string().max(60).optional(),
  productUrl: z.string().max(2000).optional(),
  availability: z.enum(["ACTIVE", "UNAVAILABLE"]).optional(),
  aiNotes: z.string().max(1000).optional(),
}).strict();
const campaignFields = z.object({
  goal: z.enum(["PROMOTE_PRODUCT", "GET_MORE_ORDERS", "GET_STORE_VISITS", "ANNOUNCEMENT", "NEW_PRODUCT", "PROMOTION", "KEEP_PAGE_ACTIVE"]).optional(),
  productId: z.string().uuid().optional(),
  promotion: z.string().max(120).optional(),
  duration: z.string().max(120).optional(),
  instructions: z.string().max(1000).optional(),
  platforms: z.array(z.enum(["FACEBOOK", "INSTAGRAM", "TIKTOK"])).min(1).optional(),
  captions: z.object({ FACEBOOK: z.string().max(2200).optional(), INSTAGRAM: z.string().max(2200).optional(), TIKTOK: z.string().max(2200).optional() }).strict().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
}).strict();
const brandFields = z.object({
  name: z.string().min(1).max(120).optional(), description: z.string().max(1000).optional(),
  industry: z.string().max(120).optional(), location: z.string().max(120).optional(),
  operatingHours: z.string().max(120).optional(), phone: z.string().max(40).optional(),
  website: z.string().max(2000).optional(), delivery: z.string().max(200).optional(), payment: z.string().max(200).optional(),
  targetAudience: z.string().max(200).optional(), audienceAgeGroup: z.string().max(60).optional(), audienceInterests: z.string().max(200).optional(),
  tone: z.enum(["FRIENDLY", "PROFESSIONAL", "CASUAL", "ENERGETIC", "PREMIUM", "FUNNY", "INFORMATIVE"]).optional(),
  preferredLanguage: z.enum(["ENGLISH", "FILIPINO", "TAGLISH", "CEBUANO", "MIXED"]).optional(),
  defaultCTA: z.enum(["MESSAGE_US", "VISIT_STORE", "ORDER_NOW", "BOOK_NOW", "LEARN_MORE"]).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), brandGuidelines: z.string().max(2000).optional(),
}).strict();

/** Model proposals are untrusted. Execution validates again against the dashboard's form rules. */
export const DashboardControlSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CREATE_PRODUCT"), fields: productFields.extend({ name: z.string().min(1).max(120), price: z.number().min(0) }) }).strict(),
  z.object({ kind: z.literal("UPDATE_PRODUCT"), id: z.string().uuid(), fields: productFields }).strict(),
  z.object({ kind: z.literal("DELETE_PRODUCT"), id: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("SAVE_CAMPAIGN"), id: z.string().uuid().optional(), intent: z.enum(["draft", "schedule", "publish"]), fields: campaignFields }).strict(),
  z.object({ kind: z.literal("DELETE_CAMPAIGN"), id: z.string().uuid() }).strict(),
  z.object({ kind: z.literal("UPDATE_BRAND"), fields: brandFields }).strict(),
  z.object({ kind: z.literal("NAVIGATE"), page: DashboardPageSchema }).strict(),
]);
export type DashboardControl = z.infer<typeof DashboardControlSchema>;

/** Gemini's supported schema subset uses anyOf and enum for tagged variants. */
export function dashboardControlJsonSchema(): Record<string, unknown> {
  function adapt(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(adapt);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$schema").map(([key, entry]) =>
      key === "const" ? ["enum", [entry]] : [key === "oneOf" ? "anyOf" : key, adapt(entry)]));
  }
  return adapt(z.toJSONSchema(DashboardControlSchema)) as Record<string, unknown>;
}
