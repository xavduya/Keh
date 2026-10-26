"use server";

import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { DashboardControlSchema, type DashboardControl } from "@/lib/ai/control-schema";
import { isAiEnabled } from "@/lib/ai/enabled";
import { isPublishingEnabled } from "@/lib/env";
import { BrandFormSchema, CampaignDraftSchema, ProductFormSchema } from "@/lib/validation/schemas";
import { getProductById } from "@/services/product.service";
import { getCampaignWithPosts } from "@/services/campaign.service";
import { getBrandProfile } from "@/services/business.service";
import { saveProduct, removeProduct } from "@/app/(dashboard)/products/actions";
import { persistCampaign, removeCampaign } from "@/app/(dashboard)/campaigns/actions";
import { saveBrandProfile } from "@/app/(dashboard)/brand/actions";
import { manilaClock, manilaDateKey, manilaToUtcIso } from "@/utils/datetime";
import type { CampaignDraft } from "@/types";

export interface ControlReview {
  operationId: string;
  title: string;
  revision: string;
  changes: { field: string; before: string; after: string }[];
  warning?: string;
}
export type ControlResult = { success: true; message: string; href: string } | { error: string };

function form(values: Record<string, unknown>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value === null || value === undefined ? "" : String(value));
  return data;
}
function display(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
function review(title: string, control: DashboardControl, before: Record<string, unknown>, changes: Record<string, unknown>, warning?: string): ControlReview {
  return {
    operationId: randomUUID(),
    title,
    revision: createHash("sha256").update(JSON.stringify({ control, before })).digest("hex"),
    changes: Object.entries(changes).map(([field, value]) => ({ field, before: display(before[field]), after: display(value) })),
    warning,
  };
}
function requireFields(fields: object) {
  if (!Object.keys(fields).length) throw new Error("No changes were proposed. Tell Keh which fields to update.");
}
function stateError(state: { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined) {
  return state?.error ?? Object.values(state?.fieldErrors ?? {}).flat().filter(Boolean).join(" ");
}

/** Resolve IDs only through the signed-in owner's account; never trust model labels or ownership. */
async function resolve(input: unknown) {
  if (!isAiEnabled()) throw new Error("AI control is temporarily paused.");
  const control = DashboardControlSchema.parse(input);
  const { business } = await getCurrentContext();
  const scopedReview = (title: string, before: Record<string, unknown>, changes: Record<string, unknown>, warning?: string) =>
    review(title, control, { ...before, businessId: business.id }, changes, warning);
  if (control.kind === "NAVIGATE") return { control, review: review("Open dashboard page", control, {}, { page: control.page }), href: control.page };

  if (control.kind === "CREATE_PRODUCT" || control.kind === "UPDATE_PRODUCT" || control.kind === "DELETE_PRODUCT") {
    const existing = control.kind === "CREATE_PRODUCT" ? null : await getProductById(control.id);
    if (control.kind !== "CREATE_PRODUCT" && (!existing || existing.businessId !== business.id)) throw new Error("That product is not available in your business.");
    const before = existing ? { name: existing.name, description: existing.description, price: existing.price, promoPrice: existing.promoPrice ?? null, category: existing.category, productUrl: existing.productUrl ?? "", availability: existing.availability, aiNotes: existing.aiNotes ?? "" } : {};
    if (control.kind === "DELETE_PRODUCT") return { control, review: review(`Delete ${existing!.name}`, control, before, { product: "Delete permanently" }, "This permanently deletes the product and its photo. Products used in campaigns cannot be deleted."), href: "/products" };
    requireFields(control.fields);
    const merged = { ...before, ...control.fields };
    const values = ProductFormSchema.parse({ ...merged, promoPrice: merged.promoPrice ?? "" });
    if (values.promoPrice !== undefined && values.promoPrice > values.price) throw new Error("The promo price cannot exceed the regular price.");
    return { control, values, review: scopedReview(existing ? `Update ${existing.name}` : `Create ${values.name}`, before, control.fields), href: "/products" };
  }

  if (control.kind === "SAVE_CAMPAIGN" || control.kind === "DELETE_CAMPAIGN") {
    const existing = control.id ? await getCampaignWithPosts(business.id, control.id) : null;
    if (control.id && !existing) throw new Error("That campaign is not available in your business.");
    if (existing?.posts.some((p) => p.status === "PUBLISHING")) throw new Error("This campaign is currently publishing. Wait for it to finish.");
    const first = existing?.posts[0];
    const before = existing ? {
      goal: existing.goal, productId: existing.productId, promotion: existing.promotion ?? "", duration: existing.duration ?? "", instructions: existing.instructions ?? "",
      platforms: existing.posts.map((p) => p.platform), captions: Object.fromEntries(existing.posts.map((p) => [p.platform, p.caption])),
      scheduledDate: first ? manilaDateKey(first.scheduledAt) : "", scheduledTime: first ? manilaClock(first.scheduledAt) : "",
      statuses: existing.posts.map((p) => p.status),
    } : {};
    if (control.kind === "DELETE_CAMPAIGN") return { control, review: review(`Delete ${first?.title ?? "campaign"}`, control, before, { campaign: "Delete permanently" }, "Deletes this campaign from Keh. Posts already published on other platforms remain there. Plan usage is not refunded."), href: "/campaigns" };
    requireFields(control.fields);
    if (control.intent === "publish" && !isPublishingEnabled()) throw new Error("Publishing is disabled. Ask Keh to save a draft instead.");
    const { statuses: _statuses, ...base } = before as typeof before & { statuses?: string[] };
    void _statuses;
    const values = CampaignDraftSchema.parse({ goal: "", productId: "", promotion: "", duration: "", instructions: "", platforms: [], scheduledDate: "", scheduledTime: "", ...base, ...control.fields, captions: { ...(existing ? Object.fromEntries(existing.posts.map((p) => [p.platform, p.caption])) : {}), ...control.fields.captions } });
    const product = await getProductById(values.productId);
    if (!product || product.businessId !== business.id) throw new Error("Select a product from your business.");
    if (values.platforms.some((platform) => !values.captions[platform]?.trim())) throw new Error("Every selected platform needs a caption. Ask Keh to complete the captions first.");
    if (control.intent === "schedule" && (!values.scheduledDate || !values.scheduledTime)) throw new Error("Choose a date and time before scheduling.");
    if (values.scheduledDate || values.scheduledTime) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.scheduledTime)) throw new Error("Choose a valid 24-hour time.");
      const date = manilaToUtcIso(values.scheduledDate, values.scheduledTime);
      if (manilaDateKey(date) !== values.scheduledDate) throw new Error("Choose a valid calendar date.");
      if (control.intent === "schedule" && new Date(date) <= new Date()) throw new Error("Choose a future time for this schedule.");
    }
    const draft: CampaignDraft = { ...values, editId: control.id ?? null };
    return { control, draft, review: scopedReview(existing ? `Update ${first?.title ?? "campaign"}` : `Create campaign for ${product.name}`, before, { ...values, intent: control.intent }, control.intent === "draft" ? undefined : isPublishingEnabled() ? "This can publish content to your connected platforms. Review captions, platforms, and Manila time before applying." : "Publishing is currently disabled. The schedule will be saved in Keh only."), href: "/campaigns" };
  }

  requireFields(control.fields);
  const brand = await getBrandProfile(business.id);
  const before = { name: business.name, description: business.description, industry: business.industry, location: business.location, operatingHours: business.operatingHours, phone: business.phone, website: business.website, delivery: business.delivery ?? "", payment: business.payment ?? "", targetAudience: business.targetAudience, audienceAgeGroup: business.audienceAgeGroup ?? "", audienceInterests: business.audienceInterests ?? "", tone: brand?.tone ?? "FRIENDLY", preferredLanguage: brand?.preferredLanguage ?? business.preferredLanguage, defaultCTA: brand?.defaultCTA ?? "MESSAGE_US", brandColor: brand?.brandColors[0] ?? "#5849da", brandGuidelines: brand?.brandGuidelines ?? "" };
  const values = BrandFormSchema.parse({ ...before, ...control.fields });
  return { control, values, review: review("Update business and brand profile", control, before, control.fields), href: "/brand" };
}

export async function reviewDashboardControl(input: unknown): Promise<{ review: ControlReview } | { error: string }> {
  try { return { review: (await resolve(input)).review }; }
  catch (error) { return { error: error instanceof Error ? error.message : "Couldn't prepare these changes." }; }
}

/** Only the explicit Apply button calls this action. Re-read state to reject stale previews. */
export async function applyDashboardControl(input: unknown, revision: string, operationId: string): Promise<ControlResult> {
  try {
    if (!z.uuid().safeParse(operationId).success) return { error: "Review these changes again before applying." };
    const resolved = await resolve(input);
    const { control } = resolved;
    if (!revision || revision !== resolved.review.revision) return { error: "This record changed after your preview. Review the latest values before applying." };
    let error: string | undefined;
    if (control.kind === "NAVIGATE") return { success: true, message: "Ready to open.", href: control.page };
    if (control.kind === "CREATE_PRODUCT" || control.kind === "UPDATE_PRODUCT") {
      const data = form(resolved.values!);
      if (control.kind === "UPDATE_PRODUCT") data.set("id", control.id);
      else data.set("controlCreationId", operationId);
      error = stateError(await saveProduct(undefined, data));
    } else if (control.kind === "DELETE_PRODUCT") error = (await removeProduct(control.id)).error;
    else if (control.kind === "SAVE_CAMPAIGN") {
      const result = await persistCampaign(resolved.draft!, control.intent, control.id ? undefined : operationId);
      if ("error" in result) error = result.error;
    } else if (control.kind === "DELETE_CAMPAIGN") error = (await removeCampaign(control.id)).error;
    else error = stateError(await saveBrandProfile(undefined, form(resolved.values!)));
    if (error) return { error };
    revalidatePath("/", "layout");
    return { success: true, message: "Changes applied successfully.", href: resolved.href };
  } catch (error) {
    console.error("Dashboard AI control failed", error);
    return { error: error instanceof Error ? error.message : "Couldn't apply these changes. Check the dashboard before retrying." };
  }
}
