import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { getCurrentContext } from "@/lib/auth/context";
import { getBrandProfile } from "@/services/business.service";
import { getProducts } from "@/services/product.service";
import { getPosts } from "@/services/campaign.service";
import { findings, recommendedSlot } from "@/lib/analytics";
import { CAMPAIGN_GOALS, DEFAULT_CTA_LABELS, LANGUAGE_LABELS, TONE_LABELS } from "@/constants";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; goal?: string; promotion?: string }>;
}) {
  const { business } = await getCurrentContext();
  const [products, brand, posts, { product, goal, promotion }] = await Promise.all([
    getProducts(business.id),
    getBrandProfile(business.id),
    getPosts(business.id),
    searchParams,
  ]);

  return (
    <CampaignWizard
      products={products.filter((p) => p.availability === "ACTIVE")}
      initialProductId={product}
      initialGoal={CAMPAIGN_GOALS.find((g) => g.value === goal)?.value}
      initialPromotion={promotion?.slice(0, 120)}
      business={{
        name: business.name,
        location: business.location,
        toneLabel: TONE_LABELS[brand?.tone ?? "FRIENDLY"],
        languageLabel: LANGUAGE_LABELS[brand?.preferredLanguage ?? business.preferredLanguage],
        ctaLabel: DEFAULT_CTA_LABELS[brand?.defaultCTA ?? "MESSAGE_US"],
        postingSlot: recommendedSlot(findings(posts)),
      }}
    />
  );
}
