"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { dismissRecommendation, refreshRecommendations } from "@/app/(dashboard)/recommendation-actions";
import { recommendationHref } from "@/utils/recommendations";
import type { AIRecommendation } from "@/types";

/** "Ideas to put into action" on the assistant page. */
export function RecommendationList({
  recommendations,
  stale,
  onLetKehFill,
}: {
  recommendations: AIRecommendation[];
  stale: boolean;
  /** Ask the assistant to fill a campaign from this idea. */
  onLetKehFill: (recommendation: AIRecommendation) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate this week's ideas in the background when needed.
  const autoRefreshed = useRef(false);
  useEffect(() => {
    if (!stale || autoRefreshed.current) return;
    autoRefreshed.current = true;
    refreshRecommendations().then((result) => {
      if (result.updated) router.refresh();
    });
  }, [stale, router]);

  function newIdeas() {
    setError(null);
    setBusyId("refresh");
    startTransition(async () => {
      const result = await refreshRecommendations({ force: true });
      if (result.error) setError(result.error);
      if (result.updated) router.refresh();
      setBusyId(null);
    });
  }

  function notNow(id: string) {
    setBusyId(id);
    startTransition(async () => {
      await dismissRecommendation(id);
      router.refresh();
      setBusyId(null);
    });
  }

  return (
    <div className="rounded-[12px] border border-[#e9e9ef] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-[15px] font-[750] text-[#262535]">Ideas to put into action</h2>
        <button
          type="button"
          onClick={newIdeas}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-[7px] px-2 py-1 text-[12px] font-[600] text-[#5849da] hover:bg-[#f0edff] disabled:opacity-50"
        >
          {busyId === "refresh" ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {busyId === "refresh" ? "Thinking…" : "New ideas"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      {recommendations.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-[#7b7b8b]">
          <LoaderCircle size={13} className="animate-spin text-[#5849da]" />
          Keh is putting together ideas for this week…
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {recommendations.map((rec, index) => (
            <article
              key={rec.id}
              className={`${index > 0 ? "border-t border-[#f0f0f4] pt-4" : ""} ${busyId === rec.id ? "opacity-50" : ""}`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <Sparkles size={13} className="text-[#5849da]" />
                <span className="text-[11px] font-[700] text-[#5849da]">
                  {index === 0 ? "Recommended next step" : "Marketing idea"}
                  {rec.generatedBy === "ai" && " · Keh AI"}
                </span>
              </div>
              <h3 className="text-[13px] font-[700] leading-snug text-[#262535]">{rec.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#7b7b8b]">{rec.explanation}</p>
              {rec.chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rec.chips.map((chip) => (
                    <span key={chip} className="rounded-md bg-[#f7f8fb] px-2 py-0.5 text-[11px] text-[#4f4e60]">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Link
                  href={recommendationHref(rec)}
                  className="inline-flex items-center gap-1 text-[12px] font-[600] text-[#5849da] hover:underline"
                >
                  {rec.actionLabel || "Plan it"}
                  <ArrowRight size={13} />
                </Link>
                <button
                  type="button"
                  onClick={() => onLetKehFill(rec)}
                  className="inline-flex items-center gap-1 text-[12px] font-[600] text-[#5849da] hover:underline"
                >
                  <Wand2 size={12} />
                  Let Keh fill it
                </button>
                <button
                  type="button"
                  onClick={() => notNow(rec.id)}
                  disabled={pending}
                  className="text-[12px] font-[500] text-[#7b7b8b] hover:underline disabled:opacity-50"
                >
                  Not now
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
