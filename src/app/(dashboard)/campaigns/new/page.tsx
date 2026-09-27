import { PageHeader } from "@/components/ui/page-header";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { getProducts } from "@/services/product.service";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function NewCampaignPage() {
  const products = await getProducts(DEMO_BUSINESS_ID);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create campaign"
        subtitle="Tell us what you want to achieve. We'll handle the social media strategy."
      />
      <CampaignWizard products={products} />
    </div>
  );
}
