import { getEnrichedCampaign, getCampaigns } from "@/services/campaign.service";
import type { EnrichedCampaign } from "@/types";
import { getCurrentContext } from "@/lib/auth/context";
import { CampaignsList } from "./CampaignsList";

export default async function CampaignsPage() {
  const { business } = await getCurrentContext();
  const campaigns = await getCampaigns(business.id);
  const enrichedCampaigns = await Promise.all(
    campaigns.map((campaign) => getEnrichedCampaign(campaign.id))
  );
  const visibleCampaigns = enrichedCampaigns.filter(
    (campaign): campaign is EnrichedCampaign => campaign !== null
  );

  return <CampaignsList campaigns={visibleCampaigns} />;
}
