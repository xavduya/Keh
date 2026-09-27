import { getPosts } from "@/services/campaign.service";
import { CalendarView } from "@/components/calendar/CalendarView";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function CalendarPage() {
  const posts = await getPosts(DEMO_BUSINESS_ID);
  return <CalendarView posts={posts} />;
}
