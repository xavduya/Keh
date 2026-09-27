/**
 * Builds what the AI knows about a business: profile, brand, catalog, the
 * business's own results and its recent captions. Shared by the assistant
 * route and recommendation generation. Server-only (reads via RLS client).
 */

import type { Business, PostPerformance, Product } from "@/types";
import type { MarketingAssistantContext } from "./ai.service";
import { getBrandProfile } from "@/services/business.service";
import { getProducts } from "@/services/product.service";
import { getPosts } from "@/services/campaign.service";
import { findings, insights, periodSummary, recommendedSlot, type Findings } from "@/lib/analytics";
import { todayKey } from "@/utils/datetime";

export interface MarketingData {
  context: MarketingAssistantContext;
  products: Product[];
  posts: PostPerformance[];
  findings: Findings;
}

export async function buildMarketingContext(business: Business): Promise<MarketingData> {
  const [products, brandProfile, posts] = await Promise.all([
    getProducts(business.id),
    getBrandProfile(business.id),
    getPosts(business.id),
  ]);
  const found = findings(posts);
  const summary = periodSummary(posts, todayKey());

  const context: MarketingAssistantContext = {
    business: {
      name: business.name,
      description: business.description,
      industry: business.industry,
      location: business.location,
      targetAudience: business.targetAudience,
      preferredLanguage: brandProfile?.preferredLanguage ?? business.preferredLanguage,
      operatingHours: business.operatingHours,
      delivery: business.delivery,
      payment: business.payment,
    },
    brandProfile: brandProfile
      ? {
          tone: brandProfile.tone,
          defaultCTA: brandProfile.defaultCTA,
          brandGuidelines: brandProfile.brandGuidelines?.slice(0, 500),
        }
      : null,
    products: products.slice(0, 12).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description.slice(0, 500),
      price: product.price,
      promoPrice: product.promoPrice,
      category: product.category,
      availability: product.availability,
      aiNotes: product.aiNotes?.slice(0, 300),
    })),
    performance:
      found.measuredCount > 0
        ? {
            measuredPosts: found.measuredCount,
            avgReach: found.avgReach,
            reachGrowthPct: summary.reachGrowthPct,
            bestProductName: found.bestProduct?.value.name,
            bestPlatform: found.bestPlatform?.value,
            insights: insights(found, summary),
          }
        : null,
    slot: recommendedSlot(found),
    recentCaptions: [...posts]
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
      .slice(0, 5)
      .map((post) => post.caption.slice(0, 280)),
  };

  return { context, products, posts, findings: found };
}
