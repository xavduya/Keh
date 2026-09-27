"use client";

import Image from "next/image";
import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { askWizardCopilot } from "@/hooks/useMarketingAssistant";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import type { Platform } from "@/types";

const PLATFORMS: Platform[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];
const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export function ContentStep() {
  const {
    draft,
    setDraft,
    nextStep,
    prevStep,
    writeCaptions,
    product,
    business,
    aiUpdatedFields,
  } = useCampaign();
  const [activePlatform, setActivePlatform] = useState<Platform>("FACEBOOK");

  function handleCaptionChange(val: string) {
    setDraft({ captions: { ...draft.captions, [activePlatform]: val } });
  }

  function handleRegenerate() {
    writeCaptions();
  }

  function handleAskAiToPolish() {
    askWizardCopilot(
      `Make the ${PLATFORM_LABELS[activePlatform]} caption punchier, high-converting, and tailored for our ${business.name} customers.`,
      "captions"
    );
  }

  const caption = draft.captions[activePlatform] ?? "";
  const isAiGenerated = aiUpdatedFields.includes("captions");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-[750] text-[22px] text-[#262535] mb-1">
          Your campaign is ready
        </h2>
        <p className="text-[14px] text-[#7b7b8b]">
          A different approach for every platform. Make it yours.
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 flex-wrap">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            className={[
              "flex items-center gap-2 px-3 py-2 rounded-[8px] border text-[13px] font-[600] transition-colors",
              activePlatform === p
                ? "bg-[#5849da] text-white border-transparent"
                : "border-[#e9e9ef] text-[#262535] hover:bg-[#f7f8fb]",
            ].join(" ")}
          >
            <SocialPlatformBadge platform={p} size="sm" />
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Caption editor */}
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-[600] text-[#262535]">
                {activePlatform === "TIKTOK" ? "Hook & caption" : "Caption"}
              </span>
              {isAiGenerated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f0edff] px-2 py-0.5 text-[11px] font-[700] text-[#5849da]">
                  <Sparkles size={11} /> AI Generated
                </span>
              )}
            </div>
            <textarea
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              rows={10}
              className={`px-3 py-2.5 border rounded-[8px] text-[14px] focus:outline-none focus:border-[#5849da] transition-colors resize-y w-full ${
                isAiGenerated
                  ? "border-[#a499ed] bg-[#fcfbfe] ring-1 ring-[#5849da]/20"
                  : "border-[#e9e9ef] bg-white"
              }`}
            />
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRegenerate}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[600] hover:bg-[#f7f8fb] transition-colors"
            >
              <Sparkles size={13} />
              {business.aiEnabled ? "Write new captions" : "Try another version"}
            </button>
            <button
              onClick={handleAskAiToPolish}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] bg-[#f0edff] text-[#5849da] text-[13px] font-[600] hover:bg-[#e6e1fa] transition-colors"
            >
              <Sparkles size={13} />
              Ask AI Manager to Polish
            </button>
          </div>
          {activePlatform === "TIKTOK" ? (
            <div className="bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px]">
              <strong>Your video plan</strong>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                <li>Show the preparation.</li>
                <li>Pour over ice.</li>
                <li>Reveal the final drink.</li>
                <li>Display the product price.</li>
              </ol>
            </div>
          ) : (
            <div className="bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px]">
              {draft.instructions || "Keep it simple and welcoming."}
              <br />
              Strategy: short video · clear price · {business.languageLabel} caption
            </div>
          )}
        </div>

        {/* Social preview */}
        <div className="bg-white border border-[#e9e9ef] rounded-[12px] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e9e9ef]">
            <span className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5849da] flex items-center justify-center">
              ☕
            </span>
            <div>
              <p className="text-[14px] font-[600] text-[#262535]">{business.name}</p>
              <p className="text-[12px] text-[#7b7b8b]">Preview · {PLATFORM_LABELS[activePlatform]}</p>
            </div>
            <span className="ml-auto">
              <SocialPlatformBadge platform={activePlatform} size="sm" />
            </span>
          </div>
          {product?.imageUrl && (
            <div className="relative w-full h-[200px]">
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="400px" unoptimized />
            </div>
          )}
          <div className="px-4 py-3">
            <p className="text-[13px] text-[#262535] whitespace-pre-wrap leading-relaxed">
              {caption}
            </p>
          </div>
          <div className="flex gap-3 px-4 pb-4 text-[#b0b0be]">
            <span>♡</span>
            <span>🔗</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e9e9ef]">
        <button onClick={prevStep} className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
          ← Back
        </button>
        <button
          onClick={nextStep}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
        >
          Continue <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
