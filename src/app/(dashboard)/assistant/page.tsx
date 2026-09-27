import { getRecommendations } from "@/services/recommendation.service";
import { getAudienceLearnings } from "@/services/analytics.service";
import { getBusiness } from "@/services/business.service";
import { getProducts } from "@/services/product.service";
import { AssistantView } from "@/components/assistant/AssistantView";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function AssistantPage() {
  const [recommendations, learnings, business, products] = await Promise.all([
    getRecommendations(DEMO_BUSINESS_ID),
    getAudienceLearnings(DEMO_BUSINESS_ID),
    getBusiness(DEMO_BUSINESS_ID),
    getProducts(DEMO_BUSINESS_ID),
  ]);

  if (!business) return null;

  return (
    <AssistantView
      recommendations={recommendations}
      learnings={learnings}
      business={business}
      firstProduct={products[0] ?? null}
    />
  );
}
