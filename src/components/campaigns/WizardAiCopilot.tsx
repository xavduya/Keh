"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Sparkles,
  Send,
  LoaderCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Wand2,
} from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { useMarketingAssistant } from "@/hooks/useMarketingAssistant";
import type { AssistantIntent, FieldChangeNotification, MarketingIdea } from "@/types";

/** Fired on window to ask the in-wizard copilot something (detail: { prompt, intent }). */
export const WIZARD_ASK_EVENT = "keh:wizard-ask";

export function askWizardCopilot(prompt: string, intent: AssistantIntent = "chat") {
  window.dispatchEvent(new CustomEvent(WIZARD_ASK_EVENT, { detail: { prompt, intent } }));
}

export function WizardAiCopilot() {
  const {
    draft,
    step,
    products,
    applyAiUpdates,
  } = useCampaign();

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  // Result of applying an idea locally (no request needed).
  const [localNote, setLocalNote] = useState<string | null>(null);

  const { messages, ask, loading, error } = useMarketingAssistant({
    onAction: (action) =>
      applyAiUpdates(
        action.draftUpdates ?? {},
        action.changes,
        action.summary,
        action.suggestedStep
      ),
  });
  const lastReply = [...messages].reverse().find((m) => m.role === "assistant");
  const lastMessage = localNote ?? lastReply?.content ?? null;
  const ideas = [...messages].reverse().find((m) => m.ideas?.length)?.ideas ?? [];

  // Contextual quick suggestions per wizard step
  const quickPrompts: { label: string; text: string; intent?: AssistantIntent }[] =
    step === 0
      ? [
          {
            label: "💡 3 Campaign Ideas",
            text: "Give me 3 creative campaign ideas for our products this week.",
            intent: "ideas",
          },
          {
            label: "🎯 Auto-fill Weekend Promo",
            text: "Fill out a weekend promotion campaign for our featured product with a discount.",
            intent: "fill",
          },
          {
            label: "🌟 Launch New Arrival",
            text: "Create a new product arrival campaign to drive customer excitement.",
            intent: "fill",
          },
        ]
      : step === 1
      ? [
          {
            label: "✨ Optimize Captions",
            text: "Rewrite and optimize these captions to be more catchy and increase conversions.",
            intent: "captions",
          },
          {
            label: "🇵🇭 Casual Taglish",
            text: "Make the captions warm, conversational, and natural in Taglish.",
            intent: "captions",
          },
          {
            label: "⚡ Punchy & Short",
            text: "Shorten the copy and make the hooks punchier for mobile readers.",
            intent: "captions",
          },
        ]
      : step === 2
      ? [
          {
            label: "📱 Best Platform Mix",
            text: "Which platforms should I target for this campaign and why?",
            intent: "chat",
          },
        ]
      : [
          {
            label: "⏰ Optimal Posting Time",
            text: "What is the best date and time to publish this campaign for highest engagement?",
            intent: "schedule",
          },
        ];

  function handleSend(textToSend?: string, intent?: AssistantIntent) {
    const query = (textToSend || prompt).trim();
    if (!query || loading) return;
    setIsOpen(true);
    setLocalNote(null);
    if (!textToSend) setPrompt("");
    ask(query, { intent: intent ?? "chat", currentDraft: draft, currentStep: step });
  }

  // Other wizard steps (e.g. "Ask AI Manager to Polish") ask through here,
  // because this copilot can see the current draft.
  useEffect(() => {
    function onAsk(event: Event) {
      const { prompt: text, intent } = (event as CustomEvent<{ prompt: string; intent?: AssistantIntent }>).detail;
      handleSend(text, intent);
    }
    window.addEventListener(WIZARD_ASK_EVENT, onAsk);
    return () => window.removeEventListener(WIZARD_ASK_EVENT, onAsk);
  });

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend();
  }

  function handleApplyIdea(idea: MarketingIdea) {
    const matchedProduct =
      products.find((p) => p.id === idea.suggestedProductId) || products[0];

    const updates = {
      goal: idea.suggestedGoal,
      productId: matchedProduct?.id || draft.productId,
      promotion: idea.suggestedPromotion || "",
      duration: idea.suggestedDuration || "",
      platforms: idea.suggestedPlatforms,
      scheduledDate: idea.suggestedDate || draft.scheduledDate,
      scheduledTime: idea.suggestedTime || draft.scheduledTime,
    };

    const changes: FieldChangeNotification[] = [
      {
        field: "goal",
        label: "Campaign Goal",
        newValue: idea.suggestedGoal,
        reason: `Applied strategy from idea "${idea.title}"`,
      },
      {
        field: "productId",
        label: "Product",
        newValue: matchedProduct?.name || "Product",
        reason: `Featured in idea "${idea.title}"`,
      },
      ...(idea.suggestedPromotion
        ? [
            {
              field: "promotion",
              label: "Promotion Offer",
              newValue: idea.suggestedPromotion,
              reason: "Applied from selected idea",
            },
          ]
        : []),
    ];

    applyAiUpdates(updates, changes, `Applied idea: ${idea.title}`);
    setLocalNote(`Applied "${idea.title}". I've filled in your goal, product and promotion details.`);
  }

  return (
    <div className="mb-6 rounded-[12px] border border-[#e9e9ef] bg-white shadow-2xs overflow-hidden">
      {/* Copilot Header / Toggle bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafafd] px-4 py-3 border-b border-[#e9e9ef]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#5849da] text-white">
            <Sparkles size={14} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-[14px] font-[750] text-[#262535]">
                Keh AI Marketing Manager
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#31a56d]/10 px-2 py-0.5 text-[10px] font-[700] text-[#248255]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#31a56d]" />
                In-website control active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick suggestions pills */}
          <div className="hidden md:flex items-center gap-1.5">
            {quickPrompts.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={loading}
                onClick={() => handleSend(q.text, q.intent)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d8d2fb] bg-[#f0edff]/60 px-2.5 py-1 text-[11px] font-[600] text-[#5849da] transition-colors hover:bg-[#5849da] hover:text-white disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 rounded-[7px] border border-[#e9e9ef] bg-white px-2.5 py-1 text-[12px] font-[600] text-[#5849da] hover:bg-[#f7f8fb]"
          >
            <MessageSquare size={13} />
            <span className="hidden sm:inline">
              {isOpen ? "Collapse AI Copilot" : "Open AI Copilot"}
            </span>
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Copilot Panel */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick prompts for mobile/tablet */}
          <div className="flex md:hidden flex-wrap gap-1.5">
            {quickPrompts.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={loading}
                onClick={() => handleSend(q.text, q.intent)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d8d2fb] bg-[#f0edff]/70 px-2.5 py-1 text-[11px] font-[600] text-[#5849da] transition-colors hover:bg-[#5849da] hover:text-white disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Assistant output / answer */}
          {lastMessage && (
            <div className="rounded-[10px] border border-[#e9e9ef] bg-[#fafafd] p-4 text-[13px] text-[#262535]">
              <div className="mb-2 flex items-center justify-between border-b border-[#ecebf4] pb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-[700] text-[#5849da]">
                  <Sparkles size={13} /> Keh Marketing Manager
                </span>
                <span className="text-[10px] text-[#7b7b8b]">
                  Fields updated in real-time
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-[#3b3a4a]">
                {lastMessage}
              </p>
            </div>
          )}

          {/* Ideas grid (if ideas returned) */}
          {ideas.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[12px] font-[700] text-[#262535]">
                <Lightbulb size={14} className="text-[#5849da]" />
                <span>Marketing ideas for your business</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {ideas.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex flex-col justify-between rounded-[8px] border border-[#e9e9ef] bg-white p-3 hover:border-[#5849da] transition-all"
                  >
                    <div>
                      <span className="inline-block rounded-md bg-[#f0edff] px-1.5 py-0.5 text-[10px] font-[700] text-[#5849da]">
                        {idea.category}
                      </span>
                      <h5 className="mt-1 font-[700] text-[12px] text-[#262535] leading-snug">
                        {idea.title}
                      </h5>
                      <p className="mt-1 text-[11px] text-[#7b7b8b] line-clamp-2">
                        {idea.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyIdea(idea)}
                      className="mt-2.5 inline-flex items-center justify-center gap-1 rounded-[6px] bg-[#5849da] px-2.5 py-1 text-[11px] font-[600] text-white hover:bg-[#493bbd] transition-colors"
                    >
                      <Wand2 size={11} />
                      Fill Fields with this Idea
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <p className="text-[12px] text-[#b9382a] bg-[#fff0f0] p-2.5 rounded-[8px]">
              {error}
            </p>
          )}

          {/* Form input */}
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <label className="sr-only" htmlFor="wizard-copilot-input">
              Ask your AI marketing manager
            </label>
            <input
              id="wizard-copilot-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Ask Keh to fill fields, adjust captions, or suggest a campaign plan…"
              className="flex-1 rounded-[8px] border border-[#e9e9ef] bg-[#f7f8fb] px-3.5 py-2 text-[13px] text-[#262535] placeholder:text-[#a0a0ad] focus:border-[#5849da] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#5849da] px-4 py-2 text-[13px] font-[600] text-white hover:bg-[#4a3cc7] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>Ask Keh</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
