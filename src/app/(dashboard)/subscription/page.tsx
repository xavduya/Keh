import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { HintBox } from "@/components/ui/hint-box";
import { mockSubscription } from "@/data/mock-business";
import { SUBSCRIPTION_PLANS } from "@/constants";

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.round((used / limit) * 100);
  return (
    <div className="w-full h-2 bg-[#e9e9ef] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#5849da] rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function SubscriptionPage() {
  const sub = mockSubscription;
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.plan) ?? SUBSCRIPTION_PLANS[1];
  const { usage } = sub;

  const features = [
    `1 business`,
    `${plan.socialAccounts} social accounts`,
    `${plan.scheduledPostsPerMonth} scheduled posts each month`,
    `${plan.aiCampaignsPerMonth} AI campaigns each month`,
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your subscription"
        subtitle="A little help for your next chapter."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current plan */}
        <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-6 flex flex-col gap-4">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#f0edff] text-[#5849da] text-[12px] font-[700] self-start">
            Your current plan
          </span>
          <div>
            <h2 className="font-heading font-[750] text-[22px] text-[#262535]">{plan.name}</h2>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-heading font-[750] text-[32px] text-[#262535]">
                ₱{plan.pricePerMonth}
              </span>
              <span className="text-[14px] text-[#7b7b8b]">/ month</span>
            </div>
          </div>
          <p className="text-[14px] text-[#7b7b8b]">
            Everything you need to start showing up consistently.
          </p>
          <ul className="space-y-2 flex-1">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[14px] text-[#262535]">
                <Check size={15} className="text-[#5849da] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <button className="px-4 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors">
              Upgrade plan
            </button>
            <button className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
              Manage subscription
            </button>
          </div>
        </section>

        {/* Usage */}
        <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-6 flex flex-col gap-5">
          <div>
            <h2 className="font-heading font-[700] text-[17px] text-[#262535]">Your usage this month</h2>
            <p className="text-[13px] text-[#7b7b8b] mt-1">
              Resets {new Date(sub.usage.resetsAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[14px]">
              <strong className="text-[#262535]">AI campaigns</strong>
              <span className="text-[#7b7b8b] font-[600]">
                {usage.aiCampaignsUsed} / {usage.aiCampaignsLimit}
              </span>
            </div>
            <ProgressBar used={usage.aiCampaignsUsed} limit={usage.aiCampaignsLimit} />
            <p className="text-[13px] text-[#7b7b8b]">
              {usage.aiCampaignsLimit - usage.aiCampaignsUsed} more ideas waiting to happen.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[14px]">
              <strong className="text-[#262535]">Scheduled posts</strong>
              <span className="text-[#7b7b8b] font-[600]">
                {usage.scheduledPostsUsed} / {usage.scheduledPostsLimit}
              </span>
            </div>
            <ProgressBar used={usage.scheduledPostsUsed} limit={usage.scheduledPostsLimit} />
            <p className="text-[13px] text-[#7b7b8b]">
              Room for {usage.scheduledPostsLimit - usage.scheduledPostsUsed} more moments.
            </p>
          </div>

          <HintBox className="mt-auto">
            Illustrative plan and usage. No payment method is connected to this prototype.
          </HintBox>
        </section>
      </div>
    </div>
  );
}
