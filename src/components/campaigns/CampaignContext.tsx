"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type {
  AIUpdateRecord,
  CampaignDraft,
  CampaignGoal,
  FieldChangeNotification,
  Product,
} from "@/types";
import { formatPrice } from "@/utils";
import type { PostingSlot } from "@/lib/analytics";
import {
  APPLY_AI_CAMPAIGN_EVENT,
  takePendingAiCampaign,
  type PendingAiCampaign,
} from "@/hooks/useMarketingAssistant";

/** Business details the wizard writes about — passed in from the server page. */
export interface WizardBusiness {
  name: string;
  location: string;
  toneLabel: string;
  languageLabel: string;
  ctaLabel: string;
  /** Best time to post, from the business's results (or the Friday-evening default). */
  postingSlot: PostingSlot;
}

interface CampaignContextValue {
  draft: CampaignDraft;
  step: number;
  products: Product[];
  business: WizardBusiness;
  /** The product currently selected in the draft (null if the business has none). */
  product: Product | null;
  /** AI change record detailing what fields were filled/updated by AI */
  aiChanges: AIUpdateRecord | null;
  /** Set of field keys updated by AI for visual highlight badges */
  aiUpdatedFields: string[];
  setDraft: (d: Partial<CampaignDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (n: number) => void;
  generateCaptions: (variation?: boolean) => void;
  /** Applies AI changes to the form fields and records the changelog */
  applyAiUpdates: (
    updates: Partial<CampaignDraft>,
    changes: FieldChangeNotification[],
    summary: string,
    suggestedStep?: number
  ) => void;
  /** Reverts the last AI changes back to previous owner state */
  revertAiUpdates: () => void;
  /** Dismisses the AI change banner while keeping field values */
  dismissAiBanner: () => void;
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
  initialPromotion,
}: {
  children: React.ReactNode;
  products: Product[];
  business: WizardBusiness;
  initialProductId?: string;
  initialGoal?: CampaignGoal;
  initialPromotion?: string;
}) {
  const firstProductId =
    products.find((p) => p.id === initialProductId)?.id ?? products[0]?.id ?? "";

  const [draft, setDraftState] = useState<CampaignDraft>({
    goal: initialGoal ?? "PROMOTE_PRODUCT",
    productId: firstProductId,
    promotion: initialPromotion ?? "",
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

  // What the AI last changed, so the owner can review or undo it.
  const [aiChanges, setAiChanges] = useState<AIUpdateRecord | null>(null);
  // Fields the AI has filled, for the "AI" badges on each step.
  const [aiUpdatedFields, setAiUpdatedFields] = useState<string[]>([]);

  // Latest draft for callbacks that must not re-subscribe on every edit.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const product = products.find((p) => p.id === draft.productId) ?? null;

  function setDraft(updates: Partial<CampaignDraft>) {
    setDraftState((prev) => ({ ...prev, ...updates }));
  }

  function generateCaptions(variation = false) {
    if (!product) return;
    setDraft({ captions: buildCaptions(draft, product, business, variation) });
    setCaptionsKey(captionInputsKey(draft));
  }

  const applyAiUpdates = useCallback(
    (
      updates: Partial<CampaignDraft>,
      changes: FieldChangeNotification[],
      summary: string,
      suggestedStep?: number
    ) => {
      // Never select a product this business doesn't have (or can't sell).
      const safeUpdates = { ...updates };
      if (safeUpdates.productId && !products.some((p) => p.id === safeUpdates.productId)) {
        delete safeUpdates.productId;
      }
      const safeChanges = safeUpdates.productId === updates.productId
        ? changes
        : changes.filter((c) => c.field !== "productId");

      const previousDraft = draftRef.current;
      const nextDraft = { ...previousDraft, ...safeUpdates };
      setDraftState(nextDraft);
      setAiChanges({ timestamp: Date.now(), summary, changes: safeChanges, previousDraft });
      setAiUpdatedFields((prev) => Array.from(new Set([...prev, ...safeChanges.map((c) => c.field)])));
      // AI-written captions count as generated for these inputs, so moving
      // on from step 0 doesn't replace them with the template.
      if (safeUpdates.captions) setCaptionsKey(captionInputsKey(nextDraft));
      if (typeof suggestedStep === "number") setStep(Math.min(Math.max(suggestedStep, 0), 4));
    },
    [products]
  );

  function revertAiUpdates() {
    if (!aiChanges?.previousDraft) return;
    setDraftState(aiChanges.previousDraft);
    setAiChanges(null);
    setAiUpdatedFields([]);
    setCaptionsKey(null);
  }

  function dismissAiBanner() {
    setAiChanges(null);
  }

  function nextStep() {
    if (step === 0) {
      if (!draft.goal || !product) return;
      // Regenerate if the goal, product or offer changed since the last run.
      if (captionsKey !== captionInputsKey(draft)) {
        generateCaptions();
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // Apply an AI-filled campaign: one handed over from another page
  // (read after mount — sessionStorage doesn't exist during server render),
  // or one sent live by the floating copilot while the wizard is open.
  useEffect(() => {
    function apply(pending: PendingAiCampaign) {
      if (!pending.draftUpdates) return;
      applyAiUpdates(
        pending.draftUpdates,
        pending.changes ?? [],
        pending.summary || "Keh filled in your campaign",
        pending.suggestedStep
      );
    }

    const pending = takePendingAiCampaign();
    if (pending) apply(pending);

    function onApply(event: Event) {
      apply((event as CustomEvent<PendingAiCampaign>).detail);
    }
    window.addEventListener(APPLY_AI_CAMPAIGN_EVENT, onApply);
    return () => window.removeEventListener(APPLY_AI_CAMPAIGN_EVENT, onApply);
  }, [applyAiUpdates]);

  return (
    <CampaignContext.Provider
      value={{
        draft,
        step,
        products,
        business,
        product,
        aiChanges,
        aiUpdatedFields,
        setDraft,
        nextStep,
        prevStep,
        setStep,
        generateCaptions,
        applyAiUpdates,
        revertAiUpdates,
        dismissAiBanner,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}
