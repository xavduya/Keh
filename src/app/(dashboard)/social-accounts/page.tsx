import { getSocialAccounts } from "@/services/social-account.service";
import { SocialAccountsManager } from "@/components/social-accounts/SocialAccountsManager";
import { getCurrentContext } from "@/lib/auth/context";


export default async function SocialAccountsPage() {
  const { business } = await getCurrentContext();
  const accounts = await getSocialAccounts(business.id);
  return <SocialAccountsManager accounts={accounts} />;
}
