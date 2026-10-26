import { getRecommendationState } from "@/services/recommendation.service";
import { getAudienceLearnings } from "@/services/analytics.service";
import { getProducts } from "@/services/product.service";
import { getCurrentContext } from "@/lib/auth/context";
import { AssistantView } from "@/components/assistant/AssistantView";
import { isAiEnabled } from "@/lib/ai/enabled";
import Link from "next/link";

export default async function AssistantPage() {
  const { business } = await getCurrentContext();
  if (!isAiEnabled()) return (
    <section className="rounded-xl border border-brand-line bg-white p-6">
      <h1 className="font-heading text-2xl font-bold">AI assistant paused</h1>
      <p className="mt-2 text-brand-muted">You can still manage products and create campaigns manually.</p>
      <Link href="/campaigns/new" className="mt-4 inline-block font-semibold text-brand">Create a campaign →</Link>
    </section>
  );
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
