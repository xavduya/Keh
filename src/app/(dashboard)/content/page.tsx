import { getPosts } from "@/services/campaign.service";
import { ContentLibrary } from "@/components/content/ContentLibrary";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function ContentPage() {
  const posts = await getPosts(DEMO_BUSINESS_ID);
  return <ContentLibrary posts={posts} />;
}
