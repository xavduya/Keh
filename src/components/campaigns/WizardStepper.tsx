"use client";

import { useCampaign } from "./CampaignContext";
import { Check } from "lucide-react";

const STEPS = ["Goal", "Content", "Platforms", "Review", "Publish"];

export function WizardStepper() {
  const { step, setStep } = useCampaign();

  return (
    <nav aria-label="Campaign steps" className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const isDone = i < step;
        const isCurrent = i === step;
        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(i)}
              disabled={i > step}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${label}`}
              title={i > step ? "Complete the current step to continue" : `Go to ${label}`}
              className="group flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-lg p-1 enabled:cursor-pointer enabled:hover:bg-[#f0edff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5849da] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            >
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
                {isDone ? <Check size={14} aria-hidden="true" /> : i + 1}
              </div>
              <span
                className={[
                  "text-[12px] font-[600] hidden sm:block",
                  isCurrent ? "text-[#5849da]" : "text-[#7b7b8b]",
                ].join(" ")}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "w-5 sm:w-12 md:w-20 h-[2px] mx-1 sm:mb-4",
                  i < step ? "bg-[#5849da]" : "bg-[#e9e9ef]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
