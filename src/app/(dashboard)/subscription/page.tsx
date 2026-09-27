import { PageHeader } from "@/components/ui/page-header";
import { HintBox } from "@/components/ui/hint-box";
import { PlanPicker } from "@/components/billing/PlanPicker";
import { getSubscription } from "@/services/business.service";
import { SUBSCRIPTION_PLANS } from "@/constants";
import { getCurrentContext } from "@/lib/auth/context";
import { getBillingProvider } from "@/lib/billing/provider";
import { isBillingEnabled } from "@/lib/env";
import { formatManilaDate } from "@/utils/datetime";

function Usage({ label, used, limit, note }: { label: string; used: number; limit: number; note: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[14px]">
        <strong className="text-brand-dark">{label}</strong>
        <span className="text-brand-muted font-[600]">
          {used} / {limit}
        </span>
      </div>
      <div
        className="w-full h-2 bg-brand-line rounded-full overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[13px] text-brand-muted">{note}</p>
    </div>
  );
}

export default async function SubscriptionPage() {
  const { business } = await getCurrentContext();
  const sub = await getSubscription(business.id);
  if (!sub) {
    return (
      <HintBox>We couldn&apos;t find your plan. Refresh the page, or contact support if this keeps happening.</HintBox>
    );
  }
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.plan) ?? SUBSCRIPTION_PLANS[0];
  const { usage } = sub;
  const billingEnabled = isBillingEnabled();
  const left = (limit: number, used: number) => Math.max(limit - used, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Your subscription" subtitle={`You're on the ${plan.name} plan.`} />

      <section className="bg-white rounded-[12px] border border-brand-line p-6 space-y-5">
        <div>
          <h2 className="font-heading font-[700] text-[17px] text-brand-dark">Your usage this month</h2>
          <p className="text-[13px] text-brand-muted mt-1">
            Resets {formatManilaDate(usage.resetsAt, { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Usage
            label="Campaigns"
            used={usage.aiCampaignsUsed}
            limit={usage.aiCampaignsLimit}
            note={`${left(usage.aiCampaignsLimit, usage.aiCampaignsUsed)} left this month.`}
          />
          <Usage
            label="Scheduled posts"
            used={usage.scheduledPostsUsed}
            limit={usage.scheduledPostsLimit}
            note={`${left(usage.scheduledPostsLimit, usage.scheduledPostsUsed)} left this month.`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading font-[700] text-[17px] text-brand-dark">Plans</h2>
        <PlanPicker currentPlan={sub.plan} billingEnabled={billingEnabled} />
        <HintBox>
          {billingEnabled
            ? `${getBillingProvider().label}. Plan changes apply right away.`
            : "Paid plans are coming soon. Everyone is on the Free plan for now."}
        </HintBox>
      </section>
    </div>
  );
}
