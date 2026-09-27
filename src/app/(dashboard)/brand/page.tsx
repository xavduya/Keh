import { getBusiness, getBrandProfile } from "@/services/business.service";
import { BrandForm } from "@/components/brand/BrandForm";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function BrandPage() {
  const [business, brandProfile] = await Promise.all([
    getBusiness(DEMO_BUSINESS_ID),
    getBrandProfile(DEMO_BUSINESS_ID),
  ]);

  if (!business || !brandProfile) return null;

  return <BrandForm business={business} brandProfile={brandProfile} />;
}
