"use client";

import Link from "next/link";
import { Calendar, Sparkles } from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import type { Platform } from "@/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export function PublishStep() {
  const { draft, setDraft, prevStep } = useCampaign();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-[750] text-[22px] text-[#262535] mb-1">
          A little planning. A lot off your plate.
        </h2>
        <p className="text-[14px] text-[#7b7b8b]">Choose when your campaign goes out.</p>
      </div>

      {/* Date + time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-[600] text-[#262535]">Date</span>
          <input
            type="date"
            value={draft.scheduledDate}
            onChange={(e) => setDraft({ scheduledDate: e.target.value })}
            className="px-3 py-2 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#5849da] transition-colors"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-[600] text-[#262535]">Time · Asia/Manila</span>
          <input
            type="time"
            value={draft.scheduledTime}
            onChange={(e) => setDraft({ scheduledTime: e.target.value })}
            className="px-3 py-2 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#5849da] transition-colors"
          />
        </label>
      </div>

      {/* Recommendation */}
      <div className="bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px] flex items-start gap-2">
        <Sparkles size={13} className="mt-0.5 shrink-0" />
        <span>
          Friday at 6:00 PM is recommended based on your sample engagement history.{" "}
          <button
            onClick={() => setDraft({ scheduledDate: "2026-10-02", scheduledTime: "18:00" })}
            className="font-[700] underline hover:no-underline"
          >
            Use recommended time
          </button>
        </span>
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-2">
        {draft.platforms.map((p) => (
          <span
            key={p}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e9e9ef] text-[13px] text-[#262535] bg-white"
          >
            <SocialPlatformBadge platform={p} size="sm" />
            {PLATFORM_LABELS[p]} · {p === "TIKTOK" ? "Manual" : "Automatic"}
          </span>
        ))}
      </div>

      <p className="text-[13px] text-[#7b7b8b]">
        Prototype only. No content will be sent to social media platforms.
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors">
          <Calendar size={15} />
          Schedule campaign
        </button>
        <button className="px-5 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
          Publish now
        </button>
        <button className="px-5 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] text-[#7b7b8b] hover:bg-[#f7f8fb] transition-colors">
          Save draft
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e9e9ef]">
        <button onClick={prevStep} className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
          ← Back
        </button>
        <Link href="/content" className="text-[13px] text-[#5849da] font-[600] hover:underline">
          Back to content
        </Link>
      </div>
    </div>
  );
}
