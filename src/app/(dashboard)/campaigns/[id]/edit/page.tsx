import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentContext } from "@/lib/auth/context";
import { getCampaignWithPosts } from "@/services/campaign.service";
import { isCampaignEditable } from "@/utils";
import { getProducts } from "@/services/product.service";
import { manilaClock, manilaDateKey } from "@/utils/datetime";
import type { CampaignDraft } from "@/types";
import { getWizardBusiness } from "../../wizard-business";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business } = await getCurrentContext();
  const [campaign, products, wizardBusiness] = await Promise.all([
    getCampaignWithPosts(business.id, id),
    getProducts(business.id),
    getWizardBusiness(business),
  ]);
  if (!campaign) notFound();

  if (!isCampaignEditable(campaign.posts)) {
    return (
      <EmptyState
        title="This campaign is already live"
        description="Published posts can't be changed from Keh. Create a new campaign to post again."
        action={
          <Link href={`/campaigns/new?product=${campaign.productId}`} className="text-[14px] font-semibold text-brand hover:underline">
            Post this product again
          </Link>
        }
      />
    );
  }

  // All posts in a campaign share one time; any post has it.
  const scheduledAt = campaign.posts[0]?.scheduledAt;
  const initialDraft: CampaignDraft = {
    goal: campaign.goal,
    productId: campaign.productId,
    promotion: campaign.promotion ?? "",
    duration: campaign.duration ?? "",
    instructions: campaign.instructions ?? "",
    scheduledDate: scheduledAt ? manilaDateKey(scheduledAt) : "",
    scheduledTime: scheduledAt ? manilaClock(scheduledAt) : "18:00",
    platforms: campaign.posts.map((p) => p.platform),
    captions: Object.fromEntries(campaign.posts.map((p) => [p.platform, p.caption])),
    editId: campaign.id,
  };

  return (
    <CampaignWizard
      // The campaign's own product stays selectable even if it's no longer for sale.
      products={products.filter((p) => p.availability === "ACTIVE" || p.id === campaign.productId)}
      initialProductId={campaign.productId}
      initialDraft={initialDraft}
      business={wizardBusiness}
    />
  );
}
