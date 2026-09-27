import {
  getAnalyticsSummary,
  getAnalyticsFindings,
  getWeeklyReach,
  getInsights,
  getPlatformReachRatio,
} from "@/services/analytics.service";
import { getPosts } from "@/services/campaign.service";
import { getCurrentContext } from "@/lib/auth/context";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export default async function AnalyticsPage() {
  const { business } = await getCurrentContext();
  const [summary, findings, weeklyReach, insights, posts] = await Promise.all([
    getAnalyticsSummary(business.id),
    getAnalyticsFindings(business.id),
    getWeeklyReach(business.id),
    getInsights(business.id),
    getPosts(business.id),
  ]);

  const platformReachRatio = {
    FACEBOOK: getPlatformReachRatio("FACEBOOK"),
    INSTAGRAM: getPlatformReachRatio("INSTAGRAM"),
    TIKTOK: getPlatformReachRatio("TIKTOK"),
  };

  return (
    <AnalyticsView
      summary={summary}
      findings={findings}
      weeklyReach={weeklyReach}
      insights={insights}
      posts={posts}
      platformReachRatio={platformReachRatio}
    />
  );
}
