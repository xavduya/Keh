"use client";

import { PageHeader } from "@/components/ui/page-header";
import { CampaignProvider, useCampaign, type WizardBusiness } from "./CampaignContext";
import { WizardStepper } from "./WizardStepper";
import { GoalStep } from "./GoalStep";
import { ContentStep } from "./ContentStep";
import { PlatformStep } from "./PlatformStep";
import { ReviewStep } from "./ReviewStep";
import { PublishStep } from "./PublishStep";
import type { Product } from "@/types";

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

export function CampaignWizard(props: {
  products: Product[];
  business: WizardBusiness;
  initialProductId?: string;
}) {
  return (
    <CampaignProvider {...props}>
      <WizardBody />
    </CampaignProvider>
  );
}
