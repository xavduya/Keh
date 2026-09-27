"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/constants";
import { changePlan } from "@/app/(dashboard)/subscription/actions";
import type { SubscriptionPlan } from "@/types";

export function planFeatures(plan: (typeof SUBSCRIPTION_PLANS)[number]): string[] {
  return [
    `${plan.aiCampaignsPerMonth} campaigns a month`,
    `${plan.scheduledPostsPerMonth} scheduled posts a month`,
    `${plan.aiRequestsPerDay} AI requests a day`,
    `${plan.socialAccounts} social accounts`,
  ];
}

/**
 * The plans side by side, with the current one marked. Used on the
 * subscription page and in onboarding. Without billing, paid plans are
 * shown but can't be chosen.
 */
export function PlanPicker({
  currentPlan,
  billingEnabled,
  onChanged,
}: {
  currentPlan: SubscriptionPlan;
  billingEnabled: boolean;
  /** Called after a successful change (onboarding moves on). */
  onChanged?: (plan: SubscriptionPlan) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(plan: SubscriptionPlan) {
    setError(null);
    setBusyPlan(plan);
    startTransition(async () => {
      const result = await changePlan(plan);
      setBusyPlan(null);
      if (result.error) setError(result.error);
      else onChanged?.(plan);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const current = plan.id === currentPlan;
          const locked = !billingEnabled && plan.pricePerMonth > 0;
          return (
            <section
              key={plan.id}
              className={[
                "rounded-[12px] border bg-white p-5 flex flex-col gap-3",
                current ? "border-brand ring-1 ring-brand" : "border-brand-line",
              ].join(" ")}
            >
              <div>
                <h3 className="font-heading text-[17px] font-[750] text-brand-dark">{plan.name}</h3>
                <p className="mt-1">
                  <span className="font-heading text-[24px] font-[750] text-brand-dark">₱{plan.pricePerMonth}</span>
                  <span className="text-[13px] text-brand-muted"> / month</span>
                </p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {planFeatures(plan).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-brand-dark">
                    <Check size={14} className="mt-0.5 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
              {current ? (
                <span className="rounded-lg bg-brand-light px-3 py-2 text-center text-[13px] font-semibold text-brand">
                  Your plan
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => choose(plan.id as SubscriptionPlan)}
                  disabled={pending || locked}
                  className="rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyPlan === plan.id ? "Switching…" : locked ? "Coming soon" : `Switch to ${plan.name}`}
                </button>
              )}
            </section>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
