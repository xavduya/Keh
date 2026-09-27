"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCampaign } from "./CampaignContext";
import { CAMPAIGN_GOALS } from "@/constants";
import {
  Package, ShoppingCart, MapPin, Megaphone, Sparkles, Tag, Heart,
} from "lucide-react";
import type { CampaignGoal } from "@/types";
import { formatPrice } from "@/utils";

const GOAL_ICONS: Record<CampaignGoal, React.ComponentType<{ size?: number; className?: string }>> = {
  PROMOTE_PRODUCT: Package,
  GET_MORE_ORDERS: ShoppingCart,
  GET_STORE_VISITS: MapPin,
  ANNOUNCEMENT: Megaphone,
  NEW_PRODUCT: Sparkles,
  PROMOTION: Tag,
  KEEP_PAGE_ACTIVE: Heart,
};

export function GoalStep() {
  const {
    draft,
    setDraft,
    nextStep,
    products,
    business,
    product,
    aiUpdatedFields,
  } = useCampaign();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-[750] text-[22px] text-[#262535] mb-1">
          What do you want to do?
        </h2>
        <p className="text-[14px] text-[#7b7b8b]">
          Start with a goal. We&apos;ll take it from there.
        </p>
      </div>

      {/* Goals grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CAMPAIGN_GOALS.map((g) => {
          const Icon = GOAL_ICONS[g.value];
          const isSelected = draft.goal === g.value;
          const isAiPicked = isSelected && aiUpdatedFields.includes("goal");
          return (
            <button
              key={g.value}
              onClick={() => setDraft({ goal: g.value })}
              className={[
                "flex items-center gap-3 px-4 py-4 rounded-[10px] border-2 text-left transition-colors relative",
                isSelected
                  ? "border-[#5849da] bg-[#f0edff] text-[#5849da]"
                  : "border-[#e9e9ef] bg-white text-[#262535] hover:border-[#c5bdf5] hover:bg-[#fafafa]",
              ].join(" ")}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-[14px] font-[600] flex-1">{g.label}</span>
              {isAiPicked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#5849da] px-1.5 py-0.5 text-[9px] font-[700] text-white">
                  <Sparkles size={9} /> AI
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Product selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-[700] text-[16px] text-[#262535]">
            What&apos;s in the spotlight?
          </h3>
          <Link href="/products" className="text-[13px] text-[#5849da] font-[600] flex items-center gap-1 hover:underline">
            <Plus size={13} />
            Add new product
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.length === 0 && (
            <Link
              href="/products"
              className="col-span-full px-4 py-6 rounded-[10px] border-2 border-dashed border-[#e9e9ef] text-center text-[14px] text-[#7b7b8b] hover:border-[#c5bdf5]"
            >
              You haven&apos;t added any products yet.{" "}
              <span className="text-[#5849da] font-[600]">Add your first product →</span>
            </Link>
          )}
          {products.map((p) => {
            const isSelected = draft.productId === p.id;
            const isAiPicked = isSelected && aiUpdatedFields.includes("productId");
            return (
              <button
                key={p.id}
                onClick={() => setDraft({ productId: p.id })}
                className={[
                  "flex items-center gap-3 px-4 py-3 rounded-[10px] border-2 text-left transition-colors relative",
                  isSelected
                    ? "border-[#5849da] bg-[#f0edff]"
                    : "border-[#e9e9ef] bg-white hover:border-[#c5bdf5]",
                ].join(" ")}
              >
                <div className="relative w-10 h-10 rounded-[6px] overflow-hidden shrink-0 bg-[#f7f8fb]">
                  {p.imageUrl && (
                    <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="40px" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={["text-[14px] font-[600] truncate", isSelected ? "text-[#5849da]" : "text-[#262535]"].join(" ")}>
                      {p.name}
                    </p>
                    {isAiPicked && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#5849da] px-1.5 py-0.5 text-[9px] font-[700] text-white">
                        <Sparkles size={9} /> AI
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#7b7b8b]">{formatPrice(p.price)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-[600] text-[#262535] flex items-center justify-between">
            <span>Promotion</span>
            {aiUpdatedFields.includes("promotion") && (
              <span className="inline-flex items-center gap-1 text-[11px] font-[700] text-[#5849da]">
                <Sparkles size={11} /> AI Filled
              </span>
            )}
          </span>
          <input
            value={draft.promotion}
            onChange={(e) => setDraft({ promotion: e.target.value })}
            className={`px-3 py-2 border rounded-[8px] text-[14px] focus:outline-none focus:border-[#5849da] transition-colors ${
              aiUpdatedFields.includes("promotion")
                ? "border-[#a499ed] bg-[#fcfbfe] ring-1 ring-[#5849da]/20"
                : "border-[#e9e9ef] bg-white"
            }`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-[600] text-[#262535] flex items-center justify-between">
            <span>Campaign duration</span>
            {aiUpdatedFields.includes("duration") && (
              <span className="inline-flex items-center gap-1 text-[11px] font-[700] text-[#5849da]">
                <Sparkles size={11} /> AI Filled
              </span>
            )}
          </span>
          <input
            value={draft.duration}
            onChange={(e) => setDraft({ duration: e.target.value })}
            className={`px-3 py-2 border rounded-[8px] text-[14px] focus:outline-none focus:border-[#5849da] transition-colors ${
              aiUpdatedFields.includes("duration")
                ? "border-[#a499ed] bg-[#fcfbfe] ring-1 ring-[#5849da]/20"
                : "border-[#e9e9ef] bg-white"
            }`}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[13px] font-[600] text-[#262535] flex items-center justify-between">
            <span>Additional instructions</span>
            {aiUpdatedFields.includes("instructions") && (
              <span className="inline-flex items-center gap-1 text-[11px] font-[700] text-[#5849da]">
                <Sparkles size={11} /> AI Filled
              </span>
            )}
          </span>
          <textarea
            value={draft.instructions}
            onChange={(e) => setDraft({ instructions: e.target.value })}
            rows={3}
            className={`px-3 py-2 border rounded-[8px] text-[14px] focus:outline-none focus:border-[#5849da] transition-colors resize-y ${
              aiUpdatedFields.includes("instructions")
                ? "border-[#a499ed] bg-[#fcfbfe] ring-1 ring-[#5849da]/20"
                : "border-[#e9e9ef] bg-white"
            }`}
          />
        </label>
      </div>

      {/* Context hint */}
      <div className="bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px] flex items-center gap-2">
        <Sparkles size={13} />
        Already in the loop: {business.name}{business.location && `, ${business.location}`} · {business.toneLabel} tone · {business.languageLabel}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e9e9ef]">
        <Link href="/dashboard" className="px-4 py-2.5 rounded-[8px] border border-[#e9e9ef] text-[14px] font-[500] hover:bg-[#f7f8fb] transition-colors">
          Cancel
        </Link>
        <button
          onClick={nextStep}
          disabled={!draft.goal || !product}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles size={15} />
          Generate campaign
        </button>
      </div>
    </div>
  );
}
