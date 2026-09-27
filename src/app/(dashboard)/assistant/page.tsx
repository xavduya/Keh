import { getRecommendationState } from "@/services/recommendation.service";
import { getAudienceLearnings } from "@/services/analytics.service";
import { getProducts } from "@/services/product.service";
import { getCurrentContext } from "@/lib/auth/context";
import { AssistantView } from "@/components/assistant/AssistantView";

export default async function AssistantPage() {
  const { business } = await getCurrentContext();
  const [{ recommendations, stale }, learnings, products] = await Promise.all([
    getRecommendationState(business.id),
    getAudienceLearnings(business.id),
    getProducts(business.id),
  ]);

  return (
    <AssistantView
      recommendations={recommendations}
      learnings={learnings}
      business={business}
      productCount={products.length}
      recommendationsStale={stale}
    />
  );
}
