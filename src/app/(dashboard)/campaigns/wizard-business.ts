import type { WizardBusiness } from "@/components/campaigns/CampaignContext";
import { DEFAULT_CTA_LABELS, LANGUAGE_LABELS, TONE_LABELS } from "@/constants";
import { findings, recommendedSlot } from "@/lib/analytics";
import { getBrandProfile } from "@/services/business.service";
import { getPosts } from "@/services/campaign.service";
import { activeProvider } from "@/lib/ai/providers";
import { isPublishingEnabled } from "@/lib/env";
import type { Business } from "@/types";

/** Business details the campaign wizard writes about (new and edit pages). */
export async function getWizardBusiness(business: Business): Promise<WizardBusiness> {
  const [brand, posts] = await Promise.all([getBrandProfile(business.id), getPosts(business.id)]);
  return {
    name: business.name,
    location: business.location,
    toneLabel: TONE_LABELS[brand?.tone ?? "FRIENDLY"],
    languageLabel: LANGUAGE_LABELS[brand?.preferredLanguage ?? business.preferredLanguage],
    ctaLabel: DEFAULT_CTA_LABELS[brand?.defaultCTA ?? "MESSAGE_US"],
    postingSlot: recommendedSlot(findings(posts)),
    aiEnabled: activeProvider() !== null,
    publishingEnabled: isPublishingEnabled(),
  };
}
