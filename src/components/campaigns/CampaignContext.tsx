"use client";

import { createContext, useContext, useState } from "react";
import type { CampaignDraft, CampaignGoal, Product } from "@/types";
import { formatPrice } from "@/utils";

/** Business details the wizard writes about — passed in from the server page. */
export interface WizardBusiness {
  name: string;
  location: string;
  toneLabel: string;
  languageLabel: string;
  ctaLabel: string;
}

interface CampaignContextValue {
  draft: CampaignDraft;
  step: number;
  products: Product[];
  business: WizardBusiness;
  /** The product currently selected in the draft (null if the business has none). */
  product: Product | null;
  setDraft: (d: Partial<CampaignDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (n: number) => void;
  generateCaptions: (variation?: boolean) => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaign must be used within CampaignProvider");
  return ctx;
}

/** Template captions — placeholder until the AI layer generates them. */
function buildCaptions(
  draft: CampaignDraft,
  product: Product,
  business: WizardBusiness,
  variation: boolean
): CampaignDraft["captions"] {
  const price = formatPrice(product.promoPrice ?? product.price);
  const offer = draft.promotion
    ? ` ${draft.promotion}${draft.duration ? ` ${draft.duration}` : ""}!`
    : "";
  const place = business.location ? `${business.name}, ${business.location}` : business.name;
  const tag = `#${business.name.replace(/[^A-Za-z0-9]/g, "")}`;
  const opening = variation ? `Your next ${product.name} moment is calling.` : "Treat yourself today!";

  return {
    FACEBOOK: `${opening} Try our ${product.name} for ${price}.${offer}\n\n${product.description}\nFind us at ${place}. ${business.ctaLabel} and make your day a little better.`,
    INSTAGRAM: `${variation ? "A little bit of happiness" : "Your daily dose of good vibes"} ✨\n${product.name} · ${price}${offer}\n📍 ${place}\n${business.ctaLabel} 💜\n${tag} #SupportLocal`,
    TIKTOK: `POV: you found your new favorite ${product.category.toLowerCase() || "treat"} 👀\n${product.name} for ${price}.${offer}\n📍 ${place}\n${tag} #SupportLocal`,
  };
}

/** Inputs that captions depend on; when these change, captions are regenerated. */
function captionInputsKey(draft: CampaignDraft) {
  return [draft.goal, draft.productId, draft.promotion, draft.duration, draft.instructions].join("|");
}

export function CampaignProvider({
  children,
  products,
  business,
  initialProductId,
  initialGoal,
}: {
  children: React.ReactNode;
  products: Product[];
  business: WizardBusiness;
  initialProductId?: string;
  initialGoal?: CampaignGoal;
}) {
  const firstProductId =
    products.find((p) => p.id === initialProductId)?.id ?? products[0]?.id ?? "";

  const [draft, setDraftState] = useState<CampaignDraft>({
    goal: initialGoal ?? "PROMOTE_PRODUCT",
    productId: firstProductId,
    promotion: "",
    duration: "",
    instructions: "",
    scheduledDate: "",
    scheduledTime: "18:00",
    platforms: ["FACEBOOK", "INSTAGRAM"],
    captions: {},
    editId: null,
  });
  const [step, setStep] = useState(0);
  // Which inputs the current captions were generated from.
  const [captionsKey, setCaptionsKey] = useState<string | null>(null);

  const product = products.find((p) => p.id === draft.productId) ?? null;

  function setDraft(updates: Partial<CampaignDraft>) {
    setDraftState((prev) => ({ ...prev, ...updates }));
  }

  function generateCaptions(variation = false) {
    if (!product) return;
    setDraft({ captions: buildCaptions(draft, product, business, variation) });
    setCaptionsKey(captionInputsKey(draft));
  }

  function nextStep() {
    if (step === 0) {
      if (!draft.goal || !product) return;
      // Regenerate if the goal, product or offer changed since the last run.
      if (captionsKey !== captionInputsKey(draft)) generateCaptions();
    }
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <CampaignContext.Provider
      value={{
        draft, step, products, business, product,
        setDraft, nextStep, prevStep, setStep, generateCaptions,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}
