import { getEnrichedCampaign, getCampaigns } from "@/services/campaign.service";
import type { EnrichedCampaign } from "@/types";
import { CampaignsList } from "./CampaignsList";

// Demo business ID — will come from the Supabase session in Phase 5.
const DEMO_BUSINESS_ID = "biz_001";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns(DEMO_BUSINESS_ID);
  const enrichedCampaigns = await Promise.all(
    campaigns.map((campaign) => getEnrichedCampaign(campaign.id))
  );
  const visibleCampaigns = enrichedCampaigns.filter(
    (campaign): campaign is EnrichedCampaign => campaign !== null
  );

  return <CampaignsList campaigns={visibleCampaigns} />;
}
