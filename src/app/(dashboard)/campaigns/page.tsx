import { getEnrichedCampaigns } from "@/services/campaign.service";
import { getCurrentContext } from "@/lib/auth/context";
import { CampaignsList } from "./CampaignsList";

export default async function CampaignsPage() {
  const { business } = await getCurrentContext();
  const campaigns = await getEnrichedCampaigns(business.id);

  return <CampaignsList campaigns={campaigns} />;
}
