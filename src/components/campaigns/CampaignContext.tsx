"use client";

import { createContext, useContext, useState } from "react";
import type { CampaignDraft, Product } from "@/types";

const emptyDraft: CampaignDraft = {
  goal: "",
  productId: "",
  promotion: "",
  duration: "",
  instructions: "",
  scheduledDate: "",
  scheduledTime: "",
  platforms: ["FACEBOOK", "INSTAGRAM"],
  captions: {},
  editId: null,
};

interface CampaignContextValue {
  draft: CampaignDraft;
  products: Product[];
  step: number;
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

export function CampaignProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: Product[];
}) {
  const firstProductId = products[0]?.id ?? "";
  const [draft, setDraftState] = useState<CampaignDraft>({
    ...emptyDraft,
    productId: firstProductId,
  });
  const [step, setStep] = useState(0);

  function setDraft(updates: Partial<CampaignDraft>) {
    setDraftState((prev) => ({ ...prev, ...updates }));
  }

  function generateCaptions(variation = false) {
    const product = products.find((p) => p.id === draft.productId) ?? products[0];
    if (!product) return;
    const offer = draft.promotion ? ` ${draft.promotion} ${draft.duration}!` : "";
    const opening = variation ? "Your next café break is calling." : "Study break? Deserve mo 'to!";

    setDraft({
      captions: {
        FACEBOOK: `${opening} Treat yourself to our ${product.name} for ₱${product.price}.${offer}\n\n${product.description}\nFind us at Juan's Café, Cebu City. Message Us and make your day a little sweeter.`,
        INSTAGRAM: `${variation ? "A little sip of happiness" : "Your daily dose of good vibes"} ☕✨\n${product.name} · ₱${product.price}${offer}\n📍 Juan's Café, Cebu City\nMessage Us 💜\n#CebuCafe #SupportLocal #CafeBreak`,
        TIKTOK: `POV: you found your new favorite study drink 👀\n${product.name} for ₱${product.price}.${offer}\n📍 Juan's Café, Cebu City\n#CebuCafe #StudyBreak #SupportLocal`,
      },
    });
  }

  function nextStep() {
    if (step === 0 && !Object.keys(draft.captions).length) {
      generateCaptions();
    }
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <CampaignContext.Provider
      value={{ draft, products, step, setDraft, nextStep, prevStep, setStep, generateCaptions }}
    >
      {children}
    </CampaignContext.Provider>
  );
}
