import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { isBillingEnabled } from "@/lib/env";
import { getBrandProfile, getSubscription } from "@/services/business.service";
import { OnboardingFlow } from "./OnboardingFlow";

/**
 * Guided setup after sign-up: business → brand voice → first product →
 * plan (only when billing is on). The (dashboard) layout sends owners here
 * until they finish or skip it.
 */
export default async function OnboardingPage() {
  const { user, business } = await getCurrentContext();
  if (business.onboarded) redirect("/dashboard");

  const [brand, subscription] = await Promise.all([getBrandProfile(business.id), getSubscription(business.id)]);

  return (
    <OnboardingFlow
      firstName={user.fullName.split(" ")[0]}
      business={business}
      brand={{
        tone: brand?.tone ?? "FRIENDLY",
        preferredLanguage: brand?.preferredLanguage ?? business.preferredLanguage,
        defaultCTA: brand?.defaultCTA ?? "MESSAGE_US",
        brandColor: brand?.brandColors[0] ?? "#5849da",
      }}
      currentPlan={subscription?.plan ?? "FREE"}
      billingEnabled={isBillingEnabled()}
    />
  );
}
