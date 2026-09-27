import { getSocialAccounts } from "@/services/social-account.service";
import { SocialAccountsManager } from "@/components/social-accounts/SocialAccountsManager";
import { getCurrentContext } from "@/lib/auth/context";
import { isMetaConfigured } from "@/lib/env";
import { connectErrorMessage } from "@/lib/social/connect-errors";
import { isTokenEncryptionConfigured } from "@/lib/social/token-crypto";

export default async function SocialAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { business } = await getCurrentContext();
  const [accounts, { error, connected }] = await Promise.all([
    getSocialAccounts(business.id),
    searchParams,
  ]);

  return (
    <SocialAccountsManager
      accounts={accounts}
      metaConfigured={isMetaConfigured() && isTokenEncryptionConfigured()}
      error={connectErrorMessage(error)}
      justConnected={connected === "1"}
    />
  );
}
