"use client";

import { useState } from "react";
import {
  Sparkles,
  Undo2,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { useCampaign } from "./CampaignContext";

export function AiChangesBanner() {
  const { aiChanges, revertAiUpdates, dismissAiBanner } = useCampaign();
  const [expanded, setExpanded] = useState(false);

  if (!aiChanges || aiChanges.changes.length === 0) {
    return null;
  }

  const { changes, summary } = aiChanges;

  return (
    <div
      role="region"
      aria-label="Keh AI Campaign Modifications"
      className="mb-6 rounded-[12px] border border-[#d8d2fb] bg-gradient-to-r from-[#faf8ff] via-[#f5f3ff] to-[#f0edff] p-4.5 shadow-xs transition-all"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#5849da] text-white shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-[15px] font-[750] text-[#262535]">
                {summary || "Keh AI filled campaign fields"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#5849da]/10 px-2.5 py-0.5 text-[11px] font-[700] text-[#5849da]">
                <CheckCircle2 size={12} />
                {changes.length} {changes.length === 1 ? "field" : "fields"} updated
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-[#6b6a7b]">
              Your marketing manager filled these in. Review any field or edit anytime.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 rounded-[7px] border border-[#d8d2fb] bg-white px-2.5 py-1.5 text-[12px] font-[600] text-[#5849da] shadow-2xs hover:bg-[#faf9ff]"
          >
            <SlidersHorizontal size={13} />
            {expanded ? "Hide details" : "See changes"}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {aiChanges.previousDraft && (
            <button
              type="button"
              onClick={revertAiUpdates}
              className="inline-flex items-center gap-1 rounded-[7px] border border-[#e9e9ef] bg-white px-2.5 py-1.5 text-[12px] font-[600] text-[#626274] hover:border-[#b9382a] hover:bg-[#fff7f7] hover:text-[#b9382a]"
              title="Undo all changes made by AI"
            >
              <Undo2 size={13} />
              Undo
            </button>
          )}

          <button
            type="button"
            onClick={dismissAiBanner}
            className="rounded-[7px] p-1.5 text-[#7b7b8b] hover:bg-[#eae6fc] hover:text-[#262535]"
            title="Dismiss banner"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Changed fields pills */}
      {!expanded && (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-[#e5e0fb]">
          {changes.map((c) => (
            <span
              key={c.field}
              className="inline-flex items-center gap-1 rounded-[6px] bg-white/80 px-2 py-1 text-[11px] font-[600] text-[#423a85] border border-[#d8d2fb]/60"
            >
              <span className="text-[#7973a8]">{c.label}:</span>
              <span className="truncate max-w-[200px]">
                {Array.isArray(c.newValue) ? c.newValue.join(", ") : c.newValue}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Expanded detailed breakdown */}
      {expanded && (
        <div className="mt-3 rounded-[8px] border border-[#d8d2fb] bg-white p-3.5 space-y-2.5 text-[12px]">
          <h4 className="font-[700] text-[#262535] text-[13px] border-b border-[#f0edff] pb-1.5 flex items-center justify-between">
            <span>Detailed Change Log</span>
            <span className="text-[11px] font-[500] text-[#7b7b8b]">
              Transparent audit trail
            </span>
          </h4>
          <div className="divide-y divide-[#f5f4fa]">
            {changes.map((c) => (
              <div key={c.field} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-[700] text-[#5849da]">{c.label}</span>
                  {c.oldValue && c.oldValue !== "None" && (
                    <span className="text-[11px] text-[#8a8998] line-through truncate max-w-[150px]">
                      {Array.isArray(c.oldValue) ? c.oldValue.join(", ") : c.oldValue}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-[600] text-[#262535]">
                  {Array.isArray(c.newValue) ? c.newValue.join(", ") : c.newValue}
                </div>
                <p className="mt-0.5 text-[11px] text-[#6b6a7b]">
                  <strong className="text-[#5849da]">Why:</strong> {c.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
