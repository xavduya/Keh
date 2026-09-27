"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Send,
  LoaderCircle,
  X,
  ArrowRight,
  CheckCircle2,
  Bot,
  Wand2,
} from "lucide-react";
import type {
  MarketingAssistantResponse,
  MarketingCampaignAction,
  MarketingIdea,
} from "@/types";

interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: MarketingCampaignAction;
  ideas?: MarketingIdea[];
}

export function MarketingManagerCopilot({
  businessName,
  businessLocation,
}: {
  businessName: string;
  businessLocation: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAlreadyInWizard = pathname === "/campaigns/new";

  // Listen to custom open events from TopBar or other components
  useEffect(() => {
    function handleOpenEvent(event: CustomEvent<{ prompt?: string }>) {
      setIsOpen(true);
      if (event.detail?.prompt) {
        setInput(event.detail.prompt);
      }
    }

    window.addEventListener(
      "keh:open-ai-copilot" as unknown as keyof WindowEventMap,
      handleOpenEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "keh:open-ai-copilot" as unknown as keyof WindowEventMap,
        handleOpenEvent as EventListener
      );
    };
  }, []);

  async function handleSendMessage(promptText?: string, intent?: string) {
    const question = (promptText || input).trim();
    if (!question || loading) return;

    setError("");
    setLoading(true);

    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptText) setInput("");

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history,
          actionIntent: intent || "chat",
        }),
      });

      const data = (await res.json()) as MarketingAssistantResponse & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(
          data.error || "Keh AI is currently unavailable. Please try again."
        );
      }

      const assistantMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        action: data.action,
        ideas: data.ideas,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If the AI modified/filled fields:
      if (data.action?.draftUpdates) {
        if (isAlreadyInWizard) {
          // If already in wizard, dispatch event to update active context live
          window.dispatchEvent(
            new CustomEvent("keh:apply-ai-campaign", {
              detail: {
                draftUpdates: data.action.draftUpdates,
                changes: data.action.changes,
                summary: data.action.summary,
                suggestedStep: data.action.suggestedStep,
              },
            })
          );
        } else {
          // Store in sessionStorage so opening /campaigns/new will adopt this draft
          sessionStorage.setItem(
            "keh_pending_ai_campaign",
            JSON.stringify({
              draftUpdates: data.action.draftUpdates,
              changes: data.action.changes,
              summary: data.action.summary,
              suggestedStep: data.action.suggestedStep,
            })
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to receive marketing advice."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    handleSendMessage();
  }

  function handleLaunchWizard(action?: MarketingCampaignAction) {
    if (action?.draftUpdates) {
      sessionStorage.setItem(
        "keh_pending_ai_campaign",
        JSON.stringify({
          draftUpdates: action.draftUpdates,
          changes: action.changes,
          summary: action.summary,
          suggestedStep: action.suggestedStep,
        })
      );
    }
    setIsOpen(false);
    router.push("/campaigns/new");
  }

  const starterSuggestions = [
    {
      title: "💡 Brainstorm 3 Campaign Ideas",
      query: "Give me 3 high-converting marketing campaign ideas for our business.",
      intent: "ideas",
    },
    {
      title: "🎯 Fill Out Weekend Promo",
      query: "Fill in a weekend promotion campaign for our best-selling product.",
      intent: "fill",
    },
    {
      title: "✍️ Write Instagram Captions",
      query: "Write engaging Instagram captions with hooks and hashtags for my products.",
      intent: "captions",
    },
  ];

  return (
    <>
      {/* Floating Copilot Launcher Pill (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Keh AI Marketing Manager"
            className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#5849da] via-[#6353e8] to-[#7667f5] px-4 py-2.5 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#5849da] focus:ring-offset-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <Sparkles size={14} className="animate-pulse" />
            </span>
            <span className="text-[13px] font-[700] tracking-wide">
              Keh AI Manager
            </span>
            <span className="hidden sm:inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-[600] uppercase tracking-wider">
              Control
            </span>
          </button>
        </div>
      )}

      {/* Slide-out Copilot Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keh AI Marketing Manager"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-[#e9e9ef] bg-white shadow-2xl transition-transform animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e9e9ef] bg-gradient-to-r from-[#faf8ff] to-[#f5f3ff] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#5849da] text-white shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-heading text-[16px] font-[750] text-[#262535]">
                  Keh Marketing Manager
                </h3>
                <p className="text-[11px] text-[#7b7b8b]">
                  {businessName} {businessLocation ? `· ${businessLocation}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-[#7b7b8b] hover:bg-[#eae6fc] hover:text-[#262535]"
              aria-label="Close marketing assistant"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: Messages stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4 pt-2">
                <div className="rounded-[12px] border border-[#e9e9ef] bg-[#fcfcff] p-4 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#f0edff] text-[#5849da]">
                    <Bot size={20} />
                  </div>
                  <h4 className="font-heading text-[15px] font-[700] text-[#262535]">
                    Your on-demand marketing manager
                  </h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#7b7b8b]">
                    I handle giving creative campaign ideas and can directly
                    fill up form fields in the website to set up your posts.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-[700] uppercase tracking-wider text-[#8a8998]">
                    Suggested Actions
                  </span>
                  <div className="space-y-2">
                    {starterSuggestions.map((s) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => handleSendMessage(s.query, s.intent)}
                        className="flex w-full items-center justify-between rounded-[9px] border border-[#e9e9ef] bg-white p-3 text-left transition-colors hover:border-[#5849da] hover:bg-[#faf9ff]"
                      >
                        <span className="text-[12px] font-[600] text-[#262535]">
                          {s.title}
                        </span>
                        <ArrowRight size={13} className="text-[#5849da]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-[12px] px-4 py-3 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#5849da] text-white"
                        : "border border-[#e9e9ef] bg-[#fafafd] text-[#262535]"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5 font-[700] text-[11px]">
                      {m.role === "assistant" ? (
                        <>
                          <Sparkles size={12} className="text-[#5849da]" />
                          <span className="text-[#5849da]">Keh Marketing Manager</span>
                        </>
                      ) : (
                        <span className="text-white/80">You</span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Action change summary pill if AI modified fields */}
                    {m.action && (
                      <div className="mt-3 rounded-[8px] border border-[#d8d2fb] bg-white p-3 text-[#262535]">
                        <div className="flex items-center gap-1.5 text-[11px] font-[700] text-[#5849da]">
                          <CheckCircle2 size={13} />
                          <span>Fields Filled in Campaign Wizard</span>
                        </div>
                        <ul className="mt-1.5 space-y-1 text-[11px]">
                          {m.action.changes.slice(0, 4).map((c) => (
                            <li key={c.field} className="text-[#4f4e60]">
                              • <strong>{c.label}:</strong>{" "}
                              {Array.isArray(c.newValue)
                                ? c.newValue.join(", ")
                                : c.newValue}
                            </li>
                          ))}
                        </ul>

                        {!isAlreadyInWizard ? (
                          <button
                            type="button"
                            onClick={() => handleLaunchWizard(m.action)}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[7px] bg-[#5849da] px-3 py-1.5 text-[12px] font-[600] text-white hover:bg-[#493bbd]"
                          >
                            <span>Open in Campaign Wizard</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : (
                          <p className="mt-2 text-[11px] font-[600] text-[#248255]">
                            ✓ Updated active wizard fields on this page!
                          </p>
                        )}
                      </div>
                    )}

                    {/* Ideas list if available */}
                    {m.ideas && m.ideas.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {m.ideas.map((idea) => (
                          <div
                            key={idea.id}
                            className="rounded-[8px] border border-[#e9e9ef] bg-white p-2.5 text-[11px]"
                          >
                            <span className="font-[700] text-[#5849da]">
                              {idea.title}
                            </span>
                            <p className="mt-0.5 text-[#626274]">{idea.summary}</p>
                            <button
                              type="button"
                              onClick={() => {
                                handleSendMessage(
                                  `Fill out a campaign for ${idea.title} with offer: ${idea.suggestedPromotion || "special treat"}`,
                                  "fill"
                                );
                              }}
                              className="mt-1.5 inline-flex items-center gap-1 font-[600] text-[#5849da] hover:underline"
                            >
                              <Wand2 size={11} /> Fill campaign from this idea
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 text-[12px] text-[#7b7b8b]">
                <LoaderCircle size={15} className="animate-spin text-[#5849da]" />
                Keh is thinking and preparing your content…
              </div>
            )}

            {error && (
              <div className="rounded-[8px] bg-[#fff0f0] p-2.5 text-[12px] text-[#b9382a]">
                {error}
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="border-t border-[#e9e9ef] bg-[#fafafd] p-4">
            <form onSubmit={handleFormSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Ask for ideas or ask to fill campaign fields…"
                className="flex-1 rounded-[8px] border border-[#e9e9ef] bg-white px-3.5 py-2 text-[13px] text-[#262535] placeholder:text-[#a0a0ad] focus:border-[#5849da] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#5849da] px-3 text-white transition-colors hover:bg-[#493bbd] disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-[#8a8998]">
              Keh directly fills up fields in your posting process and informs you of changes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
