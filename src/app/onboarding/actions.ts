"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { OnboardingBrandSchema, OnboardingBusinessSchema } from "@/lib/validation/schemas";
import {
  getBrandProfile,
  markOnboarded,
  updateBrandProfile,
  updateBusiness,
  type BusinessDetails,
} from "@/services/business.service";
import { submittedFile, uploadBusinessImage, validateImage } from "@/services/storage.service";
import type { Business } from "@/types";

export type OnboardingState =
  | { success?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

/** The business's editable details as they are now, to merge a step's changes into. */
function currentDetails(business: Business): BusinessDetails {
  return {
    name: business.name,
    description: business.description,
    industry: business.industry,
    location: business.location,
    operatingHours: business.operatingHours,
    phone: business.phone,
    website: business.website,
    delivery: business.delivery,
    payment: business.payment,
    targetAudience: business.targetAudience,
    audienceAgeGroup: business.audienceAgeGroup,
    audienceInterests: business.audienceInterests,
    preferredLanguage: business.preferredLanguage,
  };
}

/** Step 1: what the business is, where, and for whom. */
export async function saveOnboardingBusiness(_state: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { business } = await getCurrentContext();
  const parsed = OnboardingBusinessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await updateBusiness(business.id, { ...currentDetails(business), ...parsed.data });
  } catch (err) {
    console.error("saveOnboardingBusiness failed", err);
    return { error: "We couldn't save that. Please try again." };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

/** Step 2: how Keh should sound, plus an optional logo. */
export async function saveOnboardingBrand(_state: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { business } = await getCurrentContext();
  const parsed = OnboardingBrandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const logo = submittedFile(formData.get("logo"));
  const logoError = logo && validateImage(logo);
  if (logoError) return { fieldErrors: { logo: [logoError] } };

  try {
    const existing = await getBrandProfile(business.id);
    const logoUrl = logo ? await uploadBusinessImage(business.id, logo, "brand") : undefined;
    await Promise.all([
      updateBrandProfile(business.id, {
        tone: parsed.data.tone,
        preferredLanguage: parsed.data.preferredLanguage,
        brandColors: [parsed.data.brandColor],
        defaultCTA: parsed.data.defaultCTA,
        brandGuidelines: existing?.brandGuidelines,
        logoUrl,
      }),
      updateBusiness(business.id, { ...currentDetails(business), preferredLanguage: parsed.data.preferredLanguage }),
    ]);
  } catch (err) {
    console.error("saveOnboardingBrand failed", err);
    return { error: "We couldn't save that. Please try again." };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

const NEXT_PAGES = ["/dashboard", "/campaigns/new"] as const;

/** Finishes (or skips) onboarding and opens the app. */
export async function finishOnboarding(next: string): Promise<{ error?: string }> {
  const { business } = await getCurrentContext();
  try {
    await markOnboarded(business.id);
  } catch (err) {
    console.error("finishOnboarding failed", err);
    return { error: "We couldn't finish setting up. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(NEXT_PAGES.find((p) => p === next) ?? "/dashboard");
}
