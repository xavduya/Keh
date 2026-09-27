import { getCurrentContext } from "@/lib/auth/context";
import { getPosts } from "@/services/campaign.service";
import { ContentView } from "./ContentView";

export default async function ContentPage() {
  const { business } = await getCurrentContext();
  const posts = await getPosts(business.id);

  // Newest first in the library.
  return <ContentView posts={[...posts].reverse()} />;
}
