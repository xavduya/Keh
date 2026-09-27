"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateKey, manilaDateKey, manilaTime } from "@/utils/datetime";
import type { EnrichedPost } from "@/types";

const FILTERS = ["All", "Drafts", "Scheduled", "Published", "Top Performing"];

function filterPosts(posts: EnrichedPost[], filter: string): EnrichedPost[] {
  switch (filter) {
    case "Drafts": return posts.filter((p) => p.status === "DRAFT");
    case "Scheduled": return posts.filter((p) => p.status === "SCHEDULED");
    case "Published": return posts.filter((p) => p.status === "PUBLISHED");
    case "Top Performing": return posts.filter((p) => p.reach > 4000);
    default: return posts;
  }
}

function ContentCard({ post }: { post: EnrichedPost }) {
  return (
    <article className="bg-white rounded-[12px] border border-[#e9e9ef] overflow-hidden flex flex-col">
      <div className="relative w-full h-[200px] bg-[#f7f8fb]">
        {post.product.imageUrl && (
          <Image
            src={post.product.imageUrl}
            alt={post.product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-center justify-between">
          <PostStatusBadge status={post.status} />
          <div className="flex gap-1">
            {post.platforms.map((p) => (
              <SocialPlatformBadge key={p} platform={p} size="sm" />
            ))}
          </div>
        </div>
        <h3 className="font-heading font-[700] text-[16px] text-[#262535] mt-1">
          {post.title}
        </h3>
        <p className="text-[13px] text-[#7b7b8b]">{post.product.name}</p>
        <p className="text-[12px] text-[#7b7b8b]">
          {formatDateKey(manilaDateKey(post.scheduledAt), { month: "short", day: "numeric", year: "numeric" })} · {manilaTime(post.scheduledAt)}
        </p>
        <p className="text-[13px] text-[#7b7b8b]">
          {post.reach
            ? `${post.reach.toLocaleString()} people reached`
            : "Performance available after publishing"}
        </p>
        <div className="flex gap-2 mt-auto pt-2 flex-wrap">
          <Link
            href={`/campaigns/new?product=${post.productId}`}
            className="px-3 py-1.5 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] hover:bg-[#f7f8fb] transition-colors"
          >
            Post again
          </Link>
          <Link
            href="/analytics"
            className="px-3 py-1.5 text-[13px] font-[600] text-[#5849da] hover:underline"
          >
            Analytics
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ContentView({ posts }: { posts: EnrichedPost[] }) {
  const [filter, setFilter] = useState("All");
  const filtered = filterPosts(posts, filter);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your content, all together"
        subtitle="Good ideas deserve another moment in the spotlight."
        action={
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
          >
            <Plus size={15} />
            Create campaign
          </Link>
        }
      />

      <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${filter === "All" ? "content" : filter.toLowerCase()} yet`}
          description="Your ideas have a home here. Let's bring the first one to life."
          action={
            <Link
              href="/campaigns/new"
              className="px-4 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
            >
              Create campaign
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((post) => (
            <ContentCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
