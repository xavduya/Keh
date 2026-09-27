import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getBusiness } from "@/services/business.service";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const business = await getBusiness(DEMO_BUSINESS_ID);

  return (
    <DashboardLayout
      businessName={business?.name ?? "My Business"}
      businessLocation={business?.location ?? ""}
    >
      {children}
    </DashboardLayout>
  );
}
