import { getBrandProfile } from "@/services/business.service";
import { getCurrentContext } from "@/lib/auth/context";
import { BrandForm } from "@/components/brand/BrandForm";
import type { BrandProfile } from "@/types";

export default async function BrandPage() {
  const { business } = await getCurrentContext();
  const brandProfile: BrandProfile = (await getBrandProfile(business.id)) ?? {
    // Every business gets a brand profile on sign-up; this only covers gaps.
    businessId: business.id,
    tone: "FRIENDLY",
    preferredLanguage: business.preferredLanguage,
    brandColors: [],
    defaultCTA: "MESSAGE_US",
  };

  return <BrandForm business={business} brandProfile={brandProfile} />;
}
