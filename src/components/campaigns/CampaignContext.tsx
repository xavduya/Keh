"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  AIUpdateRecord,
  CampaignDraft,
  CampaignGoal,
  FieldChangeNotification,
  Product,
} from "@/types";
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

interface PendingAiStorageData {
  draftUpdates?: Partial<CampaignDraft>;
  changes?: FieldChangeNotification[];
  summary?: string;
  suggestedStep?: number;
}

function getPendingAiDraft(): PendingAiStorageData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem("keh_pending_ai_campaign");
    if (stored) {
      sessionStorage.removeItem("keh_pending_ai_campaign");
      return JSON.parse(stored) as PendingAiStorageData;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
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

  const [initialPending] = useState<PendingAiStorageData | null>(getPendingAiDraft);

  const [draft, setDraftState] = useState<CampaignDraft>(() => {
    const base: CampaignDraft = {
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
    };
    return initialPending?.draftUpdates
      ? { ...base, ...initialPending.draftUpdates }
      : base;
  });

  const [step, setStep] = useState<number>(() => initialPending?.suggestedStep ?? 0);

  // Which inputs the current captions were generated from.
  const [captionsKey, setCaptionsKey] = useState<string | null>(null);

  // AI control state: tracking what the AI modified so user is informed
  const [aiChanges, setAiChanges] = useState<AIUpdateRecord | null>(() => {
    if (!initialPending?.draftUpdates) return null;
    return {
      timestamp: Date.now(),
      summary: initialPending.summary || "AI filled campaign fields",
      changes: initialPending.changes || [],
    };
  });

  const [aiUpdatedFields, setAiUpdatedFields] = useState<string[]>(() => {
    return (initialPending?.changes || []).map((c) => c.field);
  });

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
      setDraftState((prev) => {
        const previous = { ...prev };
        setAiChanges({
          timestamp: Date.now(),
          summary,
          changes,
          previousDraft: previous,
        });
        return { ...prev, ...updates };
      });

      const changedKeys = changes.map((c) => c.field);
      setAiUpdatedFields((prev) => Array.from(new Set([...prev, ...changedKeys])));

      if (suggestedStep !== undefined && typeof suggestedStep === "number") {
        setStep(suggestedStep);
      }
    },
    []
  );

  function revertAiUpdates() {
    if (!aiChanges?.previousDraft) return;
    setDraftState(aiChanges.previousDraft);
    setAiChanges(null);
    setAiUpdatedFields([]);
  }

  function dismissAiBanner() {
    setAiChanges(null);
  }

  function nextStep() {
    if (step === 0) {
      if (!draft.goal || !product) return;
      // Regenerate if the goal, product or offer changed since the last run and no AI captions exist.
      if (captionsKey !== captionInputsKey(draft) && !draft.captions?.FACEBOOK) {
        generateCaptions();
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // Handle live custom event when copilot updates fields
  useEffect(() => {
    function handleExternalAiEvent(event: CustomEvent<{
      draftUpdates: Partial<CampaignDraft>;
      changes: FieldChangeNotification[];
      summary: string;
      suggestedStep?: number;
    }>) {
      if (event.detail?.draftUpdates) {
        applyAiUpdates(
          event.detail.draftUpdates,
          event.detail.changes || [],
          event.detail.summary || "AI applied campaign changes",
          event.detail.suggestedStep
        );
      }
    }

    window.addEventListener(
      "keh:apply-ai-campaign" as unknown as keyof WindowEventMap,
      handleExternalAiEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "keh:apply-ai-campaign" as unknown as keyof WindowEventMap,
        handleExternalAiEvent as EventListener
      );
    };
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
