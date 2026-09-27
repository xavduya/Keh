"use client";

import { CampaignProvider, useCampaign } from "@/components/campaigns/CampaignContext";
import { WizardStepper } from "@/components/campaigns/WizardStepper";
import { GoalStep } from "@/components/campaigns/GoalStep";
import { ContentStep } from "@/components/campaigns/ContentStep";
import { PlatformStep } from "@/components/campaigns/PlatformStep";
import { ReviewStep } from "@/components/campaigns/ReviewStep";
import { PublishStep } from "@/components/campaigns/PublishStep";
import type { Product } from "@/types";

function WizardBody() {
  const { step } = useCampaign();

  return (
    <>
      <WizardStepper />
      <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-6 md:p-8">
        {step === 0 && <GoalStep />}
        {step === 1 && <ContentStep />}
        {step === 2 && <PlatformStep />}
        {step === 3 && <ReviewStep />}
        {step === 4 && <PublishStep />}
      </div>
    </>
  );
}

export function CampaignWizard({ products }: { products: Product[] }) {
  return (
    <CampaignProvider products={products}>
      <WizardBody />
    </CampaignProvider>
  );
}
