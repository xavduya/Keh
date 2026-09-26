"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Tag, Video, Check, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { HintBox } from "@/components/ui/hint-box";
import { mockRecommendations } from "@/data/mock-recommendations";
import { mockAudienceLearnings } from "@/data/mock-analytics";
import { mockBusiness } from "@/data/mock-business";
import { mockProducts } from "@/data/mock-products";

export default function AssistantPage() {
  const [dismissed, setDismissed] = useState(false);
  const [priceApplied, setPriceApplied] = useState(false);
  const recommendations = mockRecommendations;
  const learnings = mockAudienceLearnings;
  const business = mockBusiness;
  const product = mockProducts[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your marketing assistant"
        subtitle="Less guesswork. More of what works for your business."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0edff] text-[#5849da] text-[12px] font-[700]">
            <Sparkles size={13} />
            Keh AI
          </span>
        }
      />

      {/* Recommendation cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-[700] text-[17px] text-[#262535]">
            A few ideas worth trying
          </h2>
          <span className="text-[13px] text-[#7b7b8b]">Based on your sample posts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 — top recommendation (dismissible) */}
          {!dismissed && (
            <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5 flex flex-col gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#f0edff] text-[#5849da] text-[12px] font-[700] self-start">
                Your next best move
              </span>
              <h3 className="font-heading font-[750] text-[17px] text-[#262535]">
                {recommendations[0].title}
              </h3>
              <p className="text-[14px] text-[#7b7b8b] flex-1">
                {recommendations[0].explanation}
              </p>
              <HintBox>Try a short preparation video on Friday evening.</HintBox>
              <div className="flex gap-2 mt-1">
                <Link
                  href="/campaigns/new"
                  className="px-3 py-2 rounded-[7px] bg-[#5849da] text-white text-[13px] font-[600] hover:bg-[#4a3cc7] transition-colors"
                >
                  Create campaign
                </Link>
                <button
                  onClick={() => setDismissed(true)}
                  className="px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] text-[#7b7b8b] hover:bg-[#f7f8fb] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Card 2 — price */}
          <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5 flex flex-col gap-3">
            <Tag size={20} className="text-[#5849da]" />
            <h3 className="font-heading font-[750] text-[17px] text-[#262535]">
              {recommendations[2].title}
            </h3>
            <p className="text-[14px] text-[#7b7b8b] flex-1">
              {recommendations[2].explanation}
            </p>
            <HintBox>A clear price makes ordering a little easier.</HintBox>
            <button
              onClick={() => setPriceApplied((v) => !v)}
              className={[
                "px-3 py-2 rounded-[7px] border text-[13px] font-[600] transition-colors self-start",
                priceApplied
                  ? "border-[#23876c] text-[#23876c] bg-[#edf7f2]"
                  : "border-[#e9e9ef] text-[#262535] hover:bg-[#f7f8fb]",
              ].join(" ")}
            >
              {priceApplied ? "✓ Applied to future posts" : "Apply to future posts"}
            </button>
          </div>

          {/* Card 3 — behind the counter */}
          <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5 flex flex-col gap-3">
            <Video size={20} className="text-[#5849da]" />
            <h3 className="font-heading font-[750] text-[17px] text-[#262535]">
              {recommendations[1].title}
            </h3>
            <p className="text-[14px] text-[#7b7b8b] flex-1">
              {recommendations[1].explanation}
            </p>
            <HintBox>Show the care that goes into every cup.</HintBox>
            <Link
              href="/campaigns/new"
              className="px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[600] text-[#262535] hover:bg-[#f7f8fb] transition-colors self-start"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>

      {/* What I've learned */}
      <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-6">
        <h2 className="font-heading font-[750] text-[17px] text-[#262535] mb-4">
          What I&apos;ve learned about your audience
        </h2>
        <ul className="space-y-2">
          {learnings.map((l) => (
            <li key={l} className="flex items-start gap-3 text-[14px] text-[#262535]">
              <Check size={16} className="text-[#5849da] mt-0.5 shrink-0" />
              {l}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-[#7b7b8b] mt-4">
          Illustrative observations from demo data, not live account analysis.
        </p>
      </div>

      {/* Ask Keh */}
      <AskKeh businessName={business.name} productName={product.name} productPrice={product.price} />
    </div>
  );
}

function AskKeh({
  businessName,
  productName,
  productPrice,
}: {
  businessName: string;
  productName: string;
  productPrice: number;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.toLowerCase();
    setAnswer(
      q.includes("poor") || q.includes("why")
        ? "I'd compare the format, price visibility, and posting time before drawing a conclusion. This demo only has sample history, so I can't diagnose a real post. Try one change at a time: use a short preparation video with the price on screen."
        : `For ${businessName}, try a 20-second ${productName} preparation video. Open with the pour, show the ₱${productPrice} price, and keep it warm and casual. Test Friday at 6 PM based on sample engagement patterns.`
    );
  }

  return (
    <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-6">
      <h2 className="font-heading font-[750] text-[17px] text-[#262535] mb-1">
        Have something in mind?
      </h2>
      <form onSubmit={handleAsk} className="flex gap-3 mt-4">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How should I promote our new coffee?"
          className="flex-1 px-4 py-2.5 border border-[#e9e9ef] rounded-[8px] text-[14px] bg-[#f7f8fb] focus:outline-none focus:border-[#5849da] transition-colors"
        />
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors shrink-0"
        >
          <ArrowRight size={15} />
          Ask Keh
        </button>
      </form>
      {answer && (
        <div className="mt-4 p-4 bg-[#f7f8fb] rounded-[8px] text-[14px] text-[#262535] whitespace-pre-wrap leading-relaxed">
          {answer}
        </div>
      )}
      <p className="text-[12px] text-[#7b7b8b] mt-3">
        Demo assistant · Suggestions use your business profile and product details.
      </p>
    </div>
  );
}
