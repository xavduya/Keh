import { getCurrentContext } from "@/lib/auth/context";
import { getPosts } from "@/services/campaign.service";
import { todayKey } from "@/utils/datetime";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const { business } = await getCurrentContext();
  const posts = await getPosts(business.id);

  return <CalendarView posts={posts} today={todayKey()} />;
}
