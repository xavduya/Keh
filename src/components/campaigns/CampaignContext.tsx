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
  askWizardCopilot,
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
  /** A language model is configured, so captions can be written by the AI. */
  aiEnabled: boolean;
  /** Keh posts to Facebook / Instagram (PUBLISHING_ENABLED); otherwise posts are only saved. */
  publishingEnabled: boolean;
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
  /** Asks the AI to write fresh captions; falls back to a template variation without AI. */
  writeCaptions: () => void;
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

/**
 * Template captions: shown instantly, and all the owner gets when no AI key
 * is configured. Built only from the business's own details, without the
 * filler phrases the AI prompt bans ("treat yourself", "your next favorite"…).
 */
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
  const opening = variation
    ? `${product.name}, ${price}, at ${place}.`
    : `New at ${business.name}? Start with our ${product.name} — ${price}.`;
  const details = product.description ? `\n\n${product.description}` : "";

  return {
    FACEBOOK: `${opening}${offer}${details}\n\n📍 ${place}\n${business.ctaLabel}`,
    INSTAGRAM: `${product.name} · ${price}${offer}${details}\n\n📍 ${place}\n${business.ctaLabel}\n${tag} #SupportLocal`,
    TIKTOK: `${product.name} at ${business.name} for ${price}.${offer}\n📍 ${place}\n${tag} #SupportLocal\n\n🎬 Video plan: 1) show the ${product.name} up close, 2) show how it's made or served, 3) end on the price and where to find you.`,
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
  initialDraft,
}: {
  children: React.ReactNode;
  products: Product[];
  business: WizardBusiness;
  initialProductId?: string;
  initialGoal?: CampaignGoal;
  initialPromotion?: string;
  /** An existing campaign being edited (draft.editId is its ID). */
  initialDraft?: CampaignDraft;
}) {
  const firstProductId =
    products.find((p) => p.id === initialProductId)?.id ?? products[0]?.id ?? "";

  const [draft, setDraftState] = useState<CampaignDraft>(initialDraft ?? {
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
  // An edited campaign's captions belong to its saved inputs; keep them.
  const [captionsKey, setCaptionsKey] = useState<string | null>(
    initialDraft ? captionInputsKey(initialDraft) : null
  );

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

  /**
   * The AI writes captions for every platform (so adding TikTok later
   * doesn't fall back to a template). The copilot sends the current draft
   * and applies the result like any other AI change, with undo.
   */
  function writeCaptions() {
    if (!product) return;
    if (!business.aiEnabled) {
      generateCaptions(true);
      return;
    }
    askWizardCopilot(
      `Write captions for Facebook, Instagram and TikTok for this ${product.name} campaign.`,
      "captions"
    );
  }

  function nextStep() {
    if (step === 0) {
      if (!draft.goal || !product) return;
      // Regenerate if the goal, product or offer changed since the last run:
      // the template shows at once, then the AI replaces it.
      if (captionsKey !== captionInputsKey(draft)) {
        generateCaptions();
        if (business.aiEnabled) writeCaptions();
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
        writeCaptions,
        applyAiUpdates,
        revertAiUpdates,
        dismissAiBanner,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}
