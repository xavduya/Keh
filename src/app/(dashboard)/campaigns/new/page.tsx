import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { getCurrentContext } from "@/lib/auth/context";
import { getBrandProfile } from "@/services/business.service";
import { getProducts } from "@/services/product.service";
import { DEFAULT_CTA_LABELS, LANGUAGE_LABELS, TONE_LABELS } from "@/constants";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { business } = await getCurrentContext();
  const [products, brand, { product }] = await Promise.all([
    getProducts(business.id),
    getBrandProfile(business.id),
    searchParams,
  ]);

  return (
    <CampaignWizard
      products={products.filter((p) => p.availability === "ACTIVE")}
      initialProductId={product}
      business={{
        name: business.name,
        location: business.location,
        toneLabel: TONE_LABELS[brand?.tone ?? "FRIENDLY"],
        languageLabel: LANGUAGE_LABELS[brand?.preferredLanguage ?? business.preferredLanguage],
        ctaLabel: DEFAULT_CTA_LABELS[brand?.defaultCTA ?? "MESSAGE_US"],
      }}
    />
  );
}
