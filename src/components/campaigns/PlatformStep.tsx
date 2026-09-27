"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { HintBox } from "@/components/ui/hint-box";
import type { Platform } from "@/types";

const PLATFORMS: Platform[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];
const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export function PlatformStep() {
  const { draft, setDraft, nextStep, prevStep, aiUpdatedFields } = useCampaign();

  function togglePlatform(p: Platform, checked: boolean) {
    const next = checked
      ? [...draft.platforms, p]
      : draft.platforms.filter((x) => x !== p);
    setDraft({ platforms: next });
  }

  function handleNext() {
    if (draft.platforms.length === 0) return;
    nextStep();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-[750] text-[22px] text-[#262535] mb-1">
          Where would you like to post?
        </h2>
        <p className="text-[14px] text-[#7b7b8b]">Choose the accounts for this campaign.</p>
      </div>

      <div className="space-y-3">
        {PLATFORMS.map((p) => {
          const isChecked = draft.platforms.includes(p);
          const isTikTok = p === "TIKTOK";
          const isAiPicked = isChecked && aiUpdatedFields.includes("platforms");
          return (
            <label
              key={p}
              className={`flex items-center gap-4 p-4 rounded-[10px] border cursor-pointer hover:bg-[#fafafa] transition-colors ${
                isAiPicked
                  ? "border-[#d8d2fb] bg-[#faf9ff]"
                  : "border-[#e9e9ef]"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => togglePlatform(p, e.target.checked)}
                className="w-4 h-4 accent-[#5849da] shrink-0"
              />
              <SocialPlatformBadge platform={p} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-[600] text-[#262535]">
                    {PLATFORM_LABELS[p]}
                  </p>
                  {isAiPicked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#5849da] px-1.5 py-0.5 text-[9px] font-[700] text-white">
                      <Sparkles size={9} /> AI Picked
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#7b7b8b]">
                  {isTikTok ? "Manual action required" : "Automatic publishing"}
                </p>
              </div>
              <PostStatusBadge status={isTikTok ? "ACTION_REQUIRED" : "SCHEDULED"} />
            </label>
          );
        })}
      </div>

      <HintBox>
        TikTok: everything will be prepared for you. Add your preferred audio and publish
        manually when it&apos;s time. All publishing is simulated in this prototype.
      </HintBox>

      {draft.platforms.length === 0 && (
        <p className="text-[13px] text-[#b54b4b]">Choose at least one platform to continue.</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e9e9ef]">
        <button onClick={prevStep} className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={draft.platforms.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
