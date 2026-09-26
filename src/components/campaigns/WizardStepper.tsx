"use client";

import { useCampaign } from "./CampaignContext";
import { Check } from "lucide-react";

const STEPS = ["Goal", "Content", "Platforms", "Review", "Publish"];

export function WizardStepper() {
  const { step } = useCampaign();

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const isDone = i < step;
        const isCurrent = i === step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-[700] border-2 transition-colors",
                  isDone
                    ? "bg-[#5849da] border-[#5849da] text-white"
                    : isCurrent
                    ? "bg-[#5849da] border-[#5849da] text-white"
                    : "bg-white border-[#e9e9ef] text-[#7b7b8b]",
                ].join(" ")}
              >
                {isDone ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={[
                  "text-[12px] font-[600] hidden sm:block",
                  isCurrent ? "text-[#5849da]" : "text-[#7b7b8b]",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "w-12 md:w-20 h-[2px] mx-1 mb-4",
                  i < step ? "bg-[#5849da]" : "bg-[#e9e9ef]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
