"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { dismissRecommendation, refreshRecommendations } from "@/app/(dashboard)/recommendation-actions";

export interface RecommendationCardData {
  /** Stored recommendation id; absent for the rules-based fallback. */
  id?: string;
  title: string;
  body: string;
  chips: string[];
  cta: string;
  href: string;
  imageUrl?: string;
  why: string;
  /** Footer label, e.g. "Written by Keh AI". */
  basis: string;
  generatedByAi: boolean;
}

export function RecommendationCard({
  data,
  stale,
}: {
  data: RecommendationCardData;
  /** Recommendations are missing or over a week old — generate new ones. */
  stale: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"refresh" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate this week's recommendations in the background when needed.
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
    setAction("refresh");
    startTransition(async () => {
      const result = await refreshRecommendations({ force: true });
      if (result.error) setError(result.error);
      if (result.updated) router.refresh();
      setAction(null);
    });
  }

  function notNow() {
    if (!data.id) return;
    setAction("dismiss");
    startTransition(async () => {
      await dismissRecommendation(data.id!);
      router.refresh();
      setAction(null);
    });
  }

  return (
    <div className={`bg-white rounded-[12px] border border-[#e9e9ef] overflow-hidden transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-[#5849da] text-[12px] font-[700] uppercase tracking-[0.06em]">
            <Sparkles size={14} />
            Recommended for this week
          </div>
          <button
            type="button"
            onClick={newIdeas}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[12px] font-[600] text-[#5849da] hover:bg-[#f0edff] disabled:opacity-50"
          >
            {action === "refresh" ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {action === "refresh" ? "Thinking…" : "New ideas"}
          </button>
        </div>
        <div className="flex gap-5">
          <div className="flex-1">
            <h2 className="font-heading text-[22px] font-[750] tracking-[-0.03em] text-[#262535] leading-[1.2] mb-3">
              {data.title}
            </h2>
            <p className="text-[14px] text-[#7b7b8b] leading-relaxed mb-4">{data.body}</p>
            {data.chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {data.chips.map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1.5 rounded-lg border border-[#e9e9ef] text-[13px] text-[#262535] bg-[#f7f8fb]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={data.href}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
              >
                <Sparkles size={15} />
                {data.cta}
              </Link>
              {data.id && (
                <button
                  type="button"
                  onClick={notNow}
                  disabled={pending}
                  className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] text-[#7b7b8b] hover:bg-[#f7f8fb] disabled:opacity-50"
                >
                  Not now
                </button>
              )}
            </div>
            {error && (
              <p role="alert" className="mt-3 text-[13px] text-destructive">
                {error}
              </p>
            )}
          </div>
          {data.imageUrl && (
            <div className="hidden sm:block relative w-[140px] h-[160px] rounded-[10px] overflow-hidden shrink-0">
              <Image src={data.imageUrl} alt="" fill className="object-cover" sizes="140px" unoptimized />
            </div>
          )}
        </div>
      </div>
      <details className="group border-t border-[#e9e9ef] px-6 py-3">
        <summary className="flex items-center justify-between cursor-pointer list-none text-[13px]">
          <span className="flex items-center gap-2 text-[#7b7b8b]">
            {data.generatedByAi ? <Sparkles size={13} /> : <BarChart2 size={13} />}
            {data.basis}
          </span>
          <span className="text-[#5849da] font-[600] group-open:hidden">Why this recommendation?</span>
          <span className="text-[#5849da] font-[600] hidden group-open:inline">Hide</span>
        </summary>
        <p className="text-[13px] text-[#7b7b8b] mt-2 leading-relaxed">{data.why}</p>
      </details>
    </div>
  );
}
