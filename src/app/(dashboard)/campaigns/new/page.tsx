import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { getCurrentContext } from "@/lib/auth/context";
import { getProducts } from "@/services/product.service";
import { CAMPAIGN_GOALS } from "@/constants";
import { getWizardBusiness } from "../wizard-business";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; goal?: string; promotion?: string }>;
}) {
  const { business } = await getCurrentContext();
  const [products, wizardBusiness, { product, goal, promotion }] = await Promise.all([
    getProducts(business.id),
    getWizardBusiness(business),
    searchParams,
  ]);

  return (
    <CampaignWizard
      products={products.filter((p) => p.availability === "ACTIVE")}
      initialProductId={product}
      initialGoal={CAMPAIGN_GOALS.find((g) => g.value === goal)?.value}
      initialPromotion={promotion?.slice(0, 120)}
      business={wizardBusiness}
    />
  );
}
