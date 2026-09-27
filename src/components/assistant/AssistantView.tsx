"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { RecommendationList } from "./RecommendationList";
import { HintBox } from "@/components/ui/hint-box";
import { stashPendingAiCampaign, useMarketingAssistant } from "@/hooks/useMarketingAssistant";
import type { AIRecommendation, AssistantIntent, Business, MarketingCampaignAction, MarketingIdea } from "@/types";

const STARTER_PROMPTS: { label: string; text: string; intent: AssistantIntent }[] = [
  {
    label: "💡 Give me 3 high-converting campaign ideas",
    text: "Give me 3 high-converting campaign ideas",
    intent: "ideas",
  },
  {
    label: "🎯 Fill out a weekend promo campaign for our best product",
    text: "Fill out a weekend promo campaign for our best product",
    intent: "fill",
  },
  {
    label: "✍️ Write engaging captions for Facebook and Instagram",
    text: "Write engaging captions for Facebook and Instagram",
    intent: "captions",
  },
  {
    label: "⏰ What is the best date and time to publish our next post?",
    text: "What is the best date and time to publish our next post?",
    intent: "schedule",
  },
];

export function AssistantView({
  recommendations,
  learnings,
  business,
  productCount,
  recommendationsStale,
}: {
  recommendations: AIRecommendation[];
  /** Missing or over a week old — the list generates new ones. */
  recommendationsStale: boolean;
  learnings: string[];
  business: Business;
  productCount: number;
}) {
  const router = useRouter();
  const { messages, ask, loading, error } = useMarketingAssistant();
  const [question, setQuestion] = useState("");

  const assistantMode = [...messages].reverse().find((m) => m.role === "assistant")?.mode ?? null;

  function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setQuestion("");
    ask(value, { intent: "chat" });
  }

  function handleLaunchWizard(action?: MarketingCampaignAction) {
    if (action) stashPendingAiCampaign(action);
    router.push("/campaigns/new");
  }

  function handleApplyIdea(idea: MarketingIdea) {
    ask(`Fill out a campaign for ${idea.title} with offer: ${idea.suggestedPromotion || "special promotion"}`, {
      intent: "fill",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your marketing manager"
        subtitle={`Practical next steps for ${business.name}, with full control in drafting and filling campaign posts.`}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f0edff] px-3 py-1.5 text-[12px] font-[700] text-[#5849da]">
            <Sparkles size={13} />
            Keh AI Manager
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section
          className="overflow-hidden rounded-[12px] border border-[#e9e9ef] bg-white"
          aria-labelledby="ask-keh-heading"
        >
          <div className="border-b border-[#e9e9ef] px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="ask-keh-heading" className="font-heading text-[18px] font-[750] text-[#262535]">
                  Plan your next move
                </h2>
                <p className="mt-1 text-[13px] text-[#7b7b8b]">
                  Ask for campaign ideas, captions, or ask Keh to fill in the campaign fields directly.
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[#f7f8fb] px-2.5 py-1 text-[11px] font-[600] text-[#626274] sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#31a56d]" />
                {assistantMode === "ai"
                  ? "AI advisor connected"
                  : assistantMode === "guided"
                    ? "Guided marketing manager"
                    : "Business context ready"}
              </span>
            </div>
          </div>

          <div
            className="max-h-[500px] min-h-[250px] space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 ? (
              <div className="flex min-h-[210px] flex-col justify-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f0edff] text-[#5849da]">
                  <MessageCircle size={19} />
                </div>
                <h3 className="font-heading text-[16px] font-[700] text-[#262535]">
                  What are you working on?
                </h3>
                <p className="mt-1 max-w-[500px] text-[13px] leading-relaxed text-[#7b7b8b]">
                  Keh can brainstorm campaign ideas, draft platform-specific captions, and take control of
                  the in-website posting process by filling in your campaign fields automatically.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => ask(p.text, { intent: p.intent })}
                      className="rounded-full border border-[#e9e9ef] px-3 py-1.5 text-left text-[12px] font-[500] text-[#4f4e60] transition-colors hover:border-[#c5bdf5] hover:bg-[#faf9ff]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0edff] text-[#5849da]">
                      <Sparkles size={14} />
                    </span>
                  )}
                  <div
                    className={`max-w-[88%] rounded-[12px] px-4 py-3 ${
                      message.role === "user"
                        ? "bg-[#5849da] text-white"
                        : "border border-[#e9e9ef] bg-[#fafafd] text-[#262535]"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`text-[11px] font-[700] ${
                          message.role === "user" ? "text-white/75" : "text-[#5849da]"
                        }`}
                      >
                        {message.role === "user" ? "You" : "Keh Marketing Manager"}
                      </span>
                      {message.mode === "guided" && (
                        <span className="text-[10px] text-[#7b7b8b]">Guided mode</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.content}</p>

                    {/* Action Changes Notification Pill & Launch Button */}
                    {message.action && (
                      <div className="mt-3.5 rounded-[10px] border border-[#d8d2fb] bg-white p-3.5 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-[#f0edff] pb-2">
                          <span className="flex items-center gap-1.5 text-[12px] font-[700] text-[#5849da]">
                            <CheckCircle2 size={14} />
                            <span>In-Website Changes Configured</span>
                          </span>
                          <span className="rounded-full bg-[#f0edff] px-2 py-0.5 text-[10px] font-[700] text-[#5849da]">
                            {message.action.changes.length} fields filled
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1.5 text-[12px]">
                          {message.action.changes.map((c) => (
                            <li key={c.field} className="text-[#4f4e60]">
                              <span className="font-[600] text-[#262535]">• {c.label}:</span>{" "}
                              {Array.isArray(c.newValue) ? c.newValue.join(", ") : c.newValue}{" "}
                              <span className="text-[11px] text-[#7b7b8b]">({c.reason})</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => handleLaunchWizard(message.action)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#5849da] px-4 py-2 text-[13px] font-[600] text-white hover:bg-[#493bbd] transition-colors"
                        >
                          <span>Open in Campaign Wizard with Pre-filled Fields</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* Marketing Idea Cards */}
                    {message.ideas && message.ideas.length > 0 && (
                      <div className="mt-3.5 space-y-2 pt-1 border-t border-[#e9e9ef]">
                        <span className="text-[11px] font-[700] uppercase tracking-wider text-[#7b7b8b]">
                          Generated Campaign Ideas
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {message.ideas.map((idea) => (
                            <div
                              key={idea.id}
                              className="flex flex-col justify-between rounded-[8px] border border-[#e9e9ef] bg-white p-3 hover:border-[#5849da] transition-all"
                            >
                              <div>
                                <span className="rounded-md bg-[#f0edff] px-1.5 py-0.5 text-[10px] font-[700] text-[#5849da]">
                                  {idea.category}
                                </span>
                                <h4 className="mt-1 font-[700] text-[12px] text-[#262535]">{idea.title}</h4>
                                <p className="mt-0.5 text-[11px] text-[#6b6a7b] line-clamp-2">
                                  {idea.summary}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyIdea(idea)}
                                className="mt-2.5 inline-flex items-center justify-center gap-1 rounded-[6px] bg-[#5849da] px-2.5 py-1 text-[11px] font-[600] text-white hover:bg-[#493bbd] transition-colors"
                              >
                                <Wand2 size={11} />
                                Fill Campaign with this Idea
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-[13px] text-[#7b7b8b]">
                <LoaderCircle size={15} className="animate-spin text-[#5849da]" />
                Keh is thinking and preparing your content…
              </div>
            )}
          </div>

          <div className="border-t border-[#e9e9ef] px-5 py-4 sm:px-6">
            {error && (
              <p role="alert" className="mb-3 flex items-start gap-2 text-[13px] text-[#b9382a]">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
            <form onSubmit={handleSubmitForm} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="keh-question">
                Ask Keh for marketing advice
              </label>
              <textarea
                id="keh-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                maxLength={1200}
                placeholder="e.g. Fill in a weekend promo for our Matcha Latte with a 15% discount"
                className="min-h-[48px] flex-1 resize-y rounded-[8px] border border-[#e9e9ef] bg-[#f7f8fb] px-3 py-2.5 text-[13px] text-[#262535] placeholder:text-[#a0a0ad] focus:border-[#5849da] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[8px] bg-[#5849da] px-4 text-[13px] font-[600] text-white transition-colors hover:bg-[#4a3cc7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
                <span className="hidden sm:inline">Ask Keh</span>
              </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[#8a8998]">
                Keh directly fills up fields in your posting process and informs you of changes.
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-1 text-[12px] font-[600] text-[#5849da] hover:underline"
              >
                Open Campaign Wizard
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[12px] border border-[#e9e9ef] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={17} className="text-[#5849da]" />
              <h2 className="font-heading text-[15px] font-[750] text-[#262535]">
                Your business at a glance
              </h2>
            </div>
            <dl className="space-y-3 text-[13px]">
              <div>
                <dt className="text-[11px] font-[600] uppercase tracking-wide text-[#8a8998]">Business</dt>
                <dd className="mt-0.5 font-[600] text-[#262535]">
                  {business.industry || business.name}
                  {business.location ? ` · ${business.location}` : ""}
                </dd>
              </div>
              {business.targetAudience && (
                <div>
                  <dt className="text-[11px] font-[600] uppercase tracking-wide text-[#8a8998]">Audience</dt>
                  <dd className="mt-0.5 text-[#262535]">{business.targetAudience}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-[600] uppercase tracking-wide text-[#8a8998]">
                  Products and services
                </dt>
                <dd className="mt-0.5 text-[#262535]">{productCount} in your catalog</dd>
              </div>
            </dl>
          </div>

          <RecommendationList
            recommendations={recommendations}
            stale={recommendationsStale}
            onLetKehFill={(rec) =>
              ask(`Turn this idea into a campaign: ${rec.title}. ${rec.explanation}`, { intent: "fill" })
            }
          />

          {learnings.length > 0 && (
            <div className="rounded-[12px] border border-[#e9e9ef] bg-white p-5">
              <h2 className="font-heading text-[15px] font-[750] text-[#262535]">What your results show</h2>
              <ul className="mt-3 space-y-2.5">
                {learnings.slice(0, 3).map((learning) => (
                  <li
                    key={learning}
                    className="flex items-start gap-2 text-[12px] leading-relaxed text-[#4f4e60]"
                  >
                    <Check size={14} className="mt-0.5 shrink-0 text-[#5849da]" />
                    {learning}
                  </li>
                ))}
              </ul>
              <HintBox>
                Based on your published posts. Keh uses these when it plans your next campaign.
              </HintBox>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
