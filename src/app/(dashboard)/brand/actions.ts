"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { BrandFormSchema } from "@/lib/validation/schemas";
import { updateBrandProfile, updateBusiness } from "@/services/business.service";
import { submittedFile, uploadBusinessImage, validateImage } from "@/services/storage.service";

export type BrandFormState =
  | {
      success?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | undefined;

export async function saveBrandProfile(
  _state: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
  const { business } = await getCurrentContext();

  const parsed = BrandFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  const logo = submittedFile(formData.get("logo"));
  const brandImage = submittedFile(formData.get("brandImage"));
  const logoError = logo && validateImage(logo);
  const brandImageError = brandImage && validateImage(brandImage);
  if (logoError || brandImageError) {
    return {
      fieldErrors: {
        ...(logoError && { logo: [logoError] }),
        ...(brandImageError && { brandImage: [brandImageError] }),
      },
    };
  }

  try {
    const [logoUrl, brandImageUrl] = await Promise.all([
      logo ? uploadBusinessImage(business.id, logo, "brand") : undefined,
      brandImage ? uploadBusinessImage(business.id, brandImage, "brand") : undefined,
    ]);

    await Promise.all([
      updateBusiness(business.id, {
        name: data.name,
        description: data.description,
        industry: data.industry,
        location: data.location,
        operatingHours: data.operatingHours,
        phone: data.phone,
        website: data.website,
        delivery: data.delivery,
        payment: data.payment,
        targetAudience: data.targetAudience,
        audienceAgeGroup: data.audienceAgeGroup,
        audienceInterests: data.audienceInterests,
        preferredLanguage: data.preferredLanguage,
      }),
      updateBrandProfile(business.id, {
        tone: data.tone,
        preferredLanguage: data.preferredLanguage,
        brandColors: [data.brandColor],
        defaultCTA: data.defaultCTA,
        brandGuidelines: data.brandGuidelines,
        logoUrl,
        brandImageUrl,
      }),
    ]);
  } catch (err) {
    console.error("saveBrandProfile failed", err);
    return { error: "We couldn't save your profile. Please try again." };
  }

  // The business name and location show in the sidebar on every page, and
  // the brand voice feeds the campaign wizard.
  revalidatePath("/", "layout");
  return { success: true };
}
