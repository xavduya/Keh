"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { getBillingProvider } from "@/lib/billing/provider";
import { isBillingEnabled } from "@/lib/env";
import { isPlan } from "@/services/billing.service";
import { getSubscription } from "@/services/business.service";

/** Switches the business to another plan (upgrade, downgrade or back to Free). */
export async function changePlan(plan: string): Promise<{ error?: string }> {
  const { business } = await getCurrentContext();
  if (!isBillingEnabled()) {
    return { error: "Paid plans aren't available yet. Everyone is on the Free plan for now." };
  }
  if (!isPlan(plan)) return { error: "That plan doesn't exist." };

  const subscription = await getSubscription(business.id);
  if (!subscription) return { error: "We couldn't find your plan. Please refresh and try again." };
  if (subscription.plan === plan) return {};

  let result;
  try {
    result = await getBillingProvider().checkout({ businessId: business.id, plan });
  } catch (err) {
    console.error("changePlan failed", err);
    return { error: "We couldn't change your plan. Please try again." };
  }
  if (result.kind === "redirect") redirect(result.url);

  revalidatePath("/subscription");
  revalidatePath("/campaigns/new");
  return {};
}
