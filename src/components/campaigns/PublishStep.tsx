"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Calendar, Sparkles } from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { saveCampaign, type SaveIntent } from "@/app/(dashboard)/campaigns/actions";
import { nextWeekday, todayKey } from "@/utils/datetime";
import type { Platform } from "@/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

const FRIDAY = 5;
const RECOMMENDED_TIME = "18:00";

export function PublishStep() {
  const { draft, setDraft, prevStep } = useCampaign();
  const [pending, startTransition] = useTransition();
  const [pendingIntent, setPendingIntent] = useState<SaveIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(intent: SaveIntent) {
    setError(null);
    setPendingIntent(intent);
    startTransition(async () => {
      // On success the action redirects to /campaigns; it only returns on error.
      const result = await saveCampaign(draft, intent);
      setError(result.error);
      setPendingIntent(null);
    });
  }

  function applyRecommendedTime() {
    setDraft({ scheduledDate: nextWeekday(todayKey(), FRIDAY), scheduledTime: RECOMMENDED_TIME });
  }

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
            min={todayKey()}
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
          Friday at 6:00 PM is a good default for most local businesses.{" "}
          <button
            type="button"
            onClick={applyRecommendedTime}
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
        Posts are saved to your calendar. Live publishing to social platforms isn&apos;t connected yet.
      </p>

      <div aria-live="polite">
        {error && (
          <p className="text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => save("schedule")}
          disabled={pending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] disabled:opacity-50 transition-colors"
        >
          <Calendar size={15} />
          {pendingIntent === "schedule" ? "Scheduling…" : "Schedule campaign"}
        </button>
        <button
          type="button"
          onClick={() => save("publish")}
          disabled={pending}
          className="px-5 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] disabled:opacity-50 transition-colors"
        >
          {pendingIntent === "publish" ? "Queuing…" : "Publish now"}
        </button>
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={pending}
          className="px-5 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] text-[#7b7b8b] hover:bg-[#f7f8fb] disabled:opacity-50 transition-colors"
        >
          {pendingIntent === "draft" ? "Saving…" : "Save draft"}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e9e9ef]">
        <button type="button" onClick={prevStep} className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
          ← Back
        </button>
        <Link href="/campaigns" className="text-[13px] text-[#5849da] font-[600] hover:underline">
          Back to campaigns
        </Link>
      </div>
    </div>
  );
}
