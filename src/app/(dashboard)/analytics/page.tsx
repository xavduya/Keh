import { getAnalyticsSummary, getWeeklyReach, getInsights, getPlatformReachRatio } from "@/services/analytics.service";
import { getPosts } from "@/services/campaign.service";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function AnalyticsPage() {
  const [summary, weeklyReach, insights, posts] = await Promise.all([
    getAnalyticsSummary(DEMO_BUSINESS_ID),
    getWeeklyReach(DEMO_BUSINESS_ID),
    getInsights(DEMO_BUSINESS_ID),
    getPosts(DEMO_BUSINESS_ID),
  ]);

  const platformReachRatio = {
    FACEBOOK: getPlatformReachRatio("FACEBOOK"),
    INSTAGRAM: getPlatformReachRatio("INSTAGRAM"),
    TIKTOK: getPlatformReachRatio("TIKTOK"),
  };

  return (
    <AnalyticsView
      summary={summary}
      weeklyReach={weeklyReach}
      insights={insights}
      posts={posts}
      platformReachRatio={platformReachRatio}
    />
  );
}
