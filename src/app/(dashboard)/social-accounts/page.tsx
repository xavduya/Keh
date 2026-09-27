import { getSocialAccounts } from "@/services/social-account.service";
import { SocialAccountsManager } from "@/components/social-accounts/SocialAccountsManager";

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function SocialAccountsPage() {
  const accounts = await getSocialAccounts(DEMO_BUSINESS_ID);
  return <SocialAccountsManager accounts={accounts} />;
}
