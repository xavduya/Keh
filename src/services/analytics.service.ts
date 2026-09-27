/**
 * Analytics service
 *
 * Performance numbers come from real posts + post_metrics: see getPosts()
 * in campaign.service.ts and the pure calculations in lib/analytics.ts.
 */

import { findings, insights, periodSummary } from "@/lib/analytics";
import { todayKey } from "@/utils/datetime";
import { getPosts } from "./campaign.service";

/**
 * What the business's own results show (best product, platform, time…),
 * for the assistant page. Empty until published posts have metrics.
 */
export async function getAudienceLearnings(businessId: string): Promise<string[]> {
  const posts = await getPosts(businessId);
  return insights(findings(posts), periodSummary(posts, todayKey()));
}
