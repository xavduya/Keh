/**
 * Billing provider interface (server-only).
 *
 * Plan changes go through a provider so a real one (PayMongo, Xendit…) can
 * replace the demo without touching the pages: it would return a hosted
 * checkout URL, and a webhook would call applyPlan() once payment succeeds.
 *
 * Today there is only the demo provider, used when BILLING_ENABLED=true:
 * it applies the plan immediately, with no payment.
 */

import type { SubscriptionPlan } from "@/types";
import { applyPlan } from "@/services/billing.service";

export type CheckoutResult =
  /** The plan changed right away (demo, downgrades, free plan). */
  | { kind: "applied" }
  /** Send the owner to the provider's hosted checkout. */
  | { kind: "redirect"; url: string };

export interface BillingProvider {
  /** Shown to the owner, e.g. "Demo checkout". */
  readonly label: string;
  checkout(input: { businessId: string; plan: SubscriptionPlan }): Promise<CheckoutResult>;
}

/** Applies plan changes immediately, without payment. For demos only. */
const demoProvider: BillingProvider = {
  label: "Demo checkout — no payment is taken",
  async checkout({ businessId, plan }) {
    await applyPlan(businessId, plan);
    return { kind: "applied" };
  },
};

export function getBillingProvider(): BillingProvider {
  return demoProvider;
}
