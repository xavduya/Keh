"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { CAMPAIGN_GOALS } from "@/constants";
import { mockProducts } from "@/data/mock-products";
import type { Platform } from "@/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export function ReviewStep() {
  const { draft, nextStep, prevStep } = useCampaign();
  const product = mockProducts.find((p) => p.id === draft.productId) ?? mockProducts[0];
  const goalLabel = CAMPAIGN_GOALS.find((g) => g.value === draft.goal)?.label ?? draft.goal;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-[750] text-[22px] text-[#262535] mb-1">
          Looking good. One last check.
        </h2>
        <p className="text-[14px] text-[#7b7b8b]">
          Review the details before adding this to your calendar.
        </p>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 p-4 bg-[#f7f8fb] rounded-[10px]">
        <div className="relative w-16 h-16 rounded-[8px] overflow-hidden shrink-0">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="64px" unoptimized />
        </div>
        <div>
          <h3 className="font-heading font-[700] text-[16px] text-[#262535]">
            {product.name} · {goalLabel}
          </h3>
          {draft.promotion && (
            <p className="text-[13px] text-[#7b7b8b]">
              {draft.promotion} · {draft.duration}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {draft.platforms.map((p) => (
              <SocialPlatformBadge key={p} platform={p} size="sm" />
            ))}
            <span className="text-[13px] text-[#7b7b8b]">
              {draft.platforms.map((p) => PLATFORM_LABELS[p]).join(" + ")}
            </span>
          </div>
        </div>
      </div>

      {/* Strategy hint */}
      <div className="bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px]">
        <strong>Your strategy</strong>
        <br />
        Short preparation video · Friendly Taglish caption · show the ₱{product.price} price.
        <br />
        Audience instructions: {draft.instructions || "Keep it welcoming."}
      </div>

      {/* Per-platform captions */}
      {draft.platforms.map((p) => (
        <details key={p} className="border border-[#e9e9ef] rounded-[10px]">
          <summary className="px-4 py-3 text-[14px] font-[600] text-[#262535] cursor-pointer select-none">
            {PLATFORM_LABELS[p]} caption
          </summary>
          <p className="px-4 pb-4 text-[13px] text-[#7b7b8b] whitespace-pre-wrap leading-relaxed">
            {draft.captions[p]}
          </p>
        </details>
      ))}

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
