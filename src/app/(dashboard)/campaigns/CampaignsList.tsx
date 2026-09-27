"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Megaphone,
  Plus,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CAMPAIGN_GOALS } from "@/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import type { EnrichedCampaign, PostStatus } from "@/types";

const FILTERS = ["All", "Drafts", "Scheduled", "Published", "Needs attention"];

const STATUS_FILTERS: Record<string, PostStatus[]> = {
  Drafts: ["DRAFT"],
  Scheduled: ["SCHEDULED", "PUBLISHING"],
  Published: ["PUBLISHED"],
  "Needs attention": ["ACTION_REQUIRED", "FAILED"],
};

interface CampaignStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}

function CampaignStat({ label, value, icon: Icon, tone }: CampaignStatProps) {
  return (
    <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${tone}`}>
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[12px] font-[600] text-[#7b7b8b]">{label}</p>
        <p className="font-heading text-[22px] font-[750] leading-tight text-[#262535]">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function CampaignCard({ campaign }: { campaign: EnrichedCampaign }) {
  const title = campaign.posts[0]?.title ?? "Untitled campaign";
  const goal =
    CAMPAIGN_GOALS.find((item) => item.value === campaign.goal)?.label ??
    "Campaign";
  const platforms = [...new Set(campaign.posts.map((post) => post.platform))];

  return (
    <article className="bg-white rounded-[12px] border border-[#e9e9ef] overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-[180px] sm:h-auto sm:w-[190px] sm:min-h-[190px] shrink-0 bg-[#f0edff]">
          <Image
            src={campaign.product.imageUrl}
            alt={campaign.product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 190px"
            unoptimized
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-[600] text-[#7b7b8b]">{goal}</p>
              <h2 className="font-heading text-[18px] font-[750] text-[#262535] mt-0.5 truncate">
                {title}
              </h2>
            </div>
            <PostStatusBadge status={campaign.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#7b7b8b]">
            <span className="font-[600] text-[#262535]">{campaign.product.name}</span>
            {campaign.promotion && <span>{campaign.promotion}</span>}
            {campaign.duration && <span>{campaign.duration}</span>}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f4] pt-3">
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#7b7b8b]">
              <span>
                {campaign.posts.length} {campaign.posts.length === 1 ? "post" : "posts"}
              </span>
              <span aria-hidden="true">·</span>
              <span>Created {formatDate(campaign.createdAt)}</span>
              <div className="flex items-center gap-1" aria-label="Campaign platforms">
                {platforms.map((platform) => (
                  <SocialPlatformBadge key={platform} platform={platform} size="sm" />
                ))}
              </div>
            </div>
            <Link
              href="/content"
              className="inline-flex items-center gap-1 text-[13px] font-[600] text-[#5849da] hover:underline"
            >
              View content
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CampaignsList({
  campaigns,
}: {
  campaigns: EnrichedCampaign[];
}) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const searchableCampaigns = campaigns.filter((campaign) => {
    const matchesFilter =
      filter === "All" || STATUS_FILTERS[filter]?.includes(campaign.status);
    const title = campaign.posts[0]?.title ?? "";
    const searchText = [
      title,
      campaign.product.name,
      campaign.promotion ?? "",
      campaign.duration ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase();

    return matchesFilter && searchText.includes(query.trim().toLocaleLowerCase());
  });

  const scheduledCount = campaigns.filter(
    (campaign) => campaign.status === "SCHEDULED" || campaign.status === "PUBLISHING"
  ).length;
  const publishedCount = campaigns.filter(
    (campaign) => campaign.status === "PUBLISHED"
  ).length;
  const attentionCount = campaigns.filter(
    (campaign) =>
      campaign.status === "ACTION_REQUIRED" || campaign.status === "FAILED"
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your campaigns"
        subtitle="Keep every idea, post, and promotion moving in one place."
        action={
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#5849da] px-4 py-2.5 text-[14px] font-[600] text-white transition-colors hover:bg-[#4a3cc7]"
          >
            <Plus size={16} />
            Create campaign
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CampaignStat
          label="All campaigns"
          value={campaigns.length}
          icon={Megaphone}
          tone="bg-[#f0edff] text-[#5849da]"
        />
        <CampaignStat
          label="Scheduled"
          value={scheduledCount}
          icon={CalendarDays}
          tone="bg-[#fff5df] text-[#a86a00]"
        />
        <CampaignStat
          label="Published"
          value={publishedCount}
          icon={CheckCircle2}
          tone="bg-[#e9f8ef] text-[#21824a]"
        />
        <CampaignStat
          label="Needs attention"
          value={attentionCount}
          icon={AlertTriangle}
          tone="bg-[#fff0ed] text-[#c84d36]"
        />
      </div>

      <section className="space-y-4" aria-label="Campaign list">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} />
          <label className="relative block w-full sm:max-w-[280px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7b8b]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search campaigns"
              aria-label="Search campaigns"
              className="w-full rounded-[8px] border border-[#e9e9ef] bg-white py-2 pl-9 pr-3 text-[13px] text-[#262535] placeholder:text-[#a0a0ad] focus:border-[#5849da] focus:outline-none"
            />
          </label>
        </div>

        {searchableCampaigns.length > 0 ? (
          <div className="space-y-3">
            {searchableCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            title="Your first campaign starts here"
            description="Bring an idea to life with a goal, a product, and content tailored for your social channels."
            action={
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#5849da] px-4 py-2.5 text-[14px] font-[600] text-white hover:bg-[#4a3cc7]"
              >
                <Plus size={15} />
                Create campaign
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="No campaigns match that search"
            description="Try another search or choose a different campaign status."
          />
        )}
      </section>
    </div>
  );
}
