import { getPosts } from "@/services/campaign.service";
import { getCurrentContext } from "@/lib/auth/context";
import { todayKey } from "@/utils/datetime";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export default async function AnalyticsPage() {
  const { business } = await getCurrentContext();
  const posts = await getPosts(business.id);

  return <AnalyticsView posts={posts} today={todayKey()} />;
}
