"use client";

import { PageHeader } from "@/components/ui/page-header";
import { CampaignProvider, useCampaign } from "@/components/campaigns/CampaignContext";
import { WizardStepper } from "@/components/campaigns/WizardStepper";
import { GoalStep } from "@/components/campaigns/GoalStep";
import { ContentStep } from "@/components/campaigns/ContentStep";
import { PlatformStep } from "@/components/campaigns/PlatformStep";
import { ReviewStep } from "@/components/campaigns/ReviewStep";
import { PublishStep } from "@/components/campaigns/PublishStep";

function WizardBody() {
  const { step } = useCampaign();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create campaign"
        subtitle="Tell us what you want to achieve. We'll handle the social media strategy."
      />

      <WizardStepper />

      <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-6 md:p-8">
        {step === 0 && <GoalStep />}
        {step === 1 && <ContentStep />}
        {step === 2 && <PlatformStep />}
        {step === 3 && <ReviewStep />}
        {step === 4 && <PublishStep />}
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <CampaignProvider>
      <WizardBody />
    </CampaignProvider>
  );
}
