"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { manilaDateKey, manilaTime } from "@/utils/datetime";
import type { EnrichedPost, Platform } from "@/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLATFORM_FILTERS = ["All", "Facebook", "Instagram", "TikTok"];
const PLATFORM_MAP: Record<string, Platform> = {
  Facebook: "FACEBOOK",
  Instagram: "INSTAGRAM",
  TikTok: "TIKTOK",
};

function getDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarView({ posts, today }: { posts: EnrichedPost[]; today: string }) {
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const [month, setMonth] = useState(todayMonth - 1); // 0-indexed
  const [year, setYear] = useState(todayYear);
  const [filter, setFilter] = useState("All");

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first offset
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  // Month summary for the header (from PR #6), on real posts in Manila time.
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthPosts = posts.filter((post) => {
    const isInMonth = manilaDateKey(post.scheduledAt).startsWith(monthPrefix);
    const matchesPlatform =
      filter === "All" || post.platforms.includes(PLATFORM_MAP[filter]);
    return isInMonth && matchesPlatform;
  });
  const scheduledCount = monthPosts.filter(
    (post) => post.status === "SCHEDULED" || post.status === "PUBLISHING"
  ).length;
  const publishedCount = monthPosts.filter(
    (post) => post.status === "PUBLISHED"
  ).length;
  const draftCount = monthPosts.filter((post) => post.status === "DRAFT").length;
  const attentionCount = monthPosts.filter(
    (post) => post.status === "ACTION_REQUIRED" || post.status === "FAILED"
  ).length;
  const postNoun = monthPosts.length === 1 ? "post" : "posts";
  const platformDescription = filter === "All" ? "across all platforms" : `on ${filter}`;
  const calendarSummary = [
    `${monthPosts.length} ${postNoun} ${platformDescription}`,
    `${scheduledCount} scheduled`,
    `${publishedCount} published`,
    `${draftCount} ${draftCount === 1 ? "draft" : "drafts"}`,
    ...(attentionCount > 0
      ? [`${attentionCount} ${attentionCount === 1 ? "needs" : "need"} attention`]
      : []),
  ].join(" · ");

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function postsForDay(day: number) {
    const dateStr = getDateStr(year, month, day);
    return posts.filter((p) => {
      if (manilaDateKey(p.scheduledAt) !== dateStr) return false;
      if (filter === "All") return true;
      return p.platforms.includes(PLATFORM_MAP[filter]);
    });
  }

  const todayStr = today;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your content calendar"
        subtitle={`${monthLabel}: ${calendarSummary}.`}
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

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-[7px] border border-[#e9e9ef] hover:bg-[#f7f8fb] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <h2 className="font-heading font-[700] text-[16px] text-[#262535] min-w-[160px] text-center">
            {monthLabel}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-[7px] border border-[#e9e9ef] hover:bg-[#f7f8fb] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => { setMonth(todayMonth - 1); setYear(todayYear); }}
            className="px-3 py-1.5 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] hover:bg-[#f7f8fb] transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <FilterTabs
        tabs={PLATFORM_FILTERS}
        active={filter}
        onChange={setFilter}
      />

      {/* Calendar grid */}
      <div className="bg-white rounded-[12px] border border-[#e9e9ef] overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#e9e9ef]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[12px] font-[600] text-[#7b7b8b] uppercase tracking-[0.05em]"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-7 border-b border-[#e9e9ef] last:border-0">
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
              const dateStr = day ? getDateStr(year, month, day) : "";
              const isToday = dateStr === todayStr;
              const dayPosts = day ? postsForDay(day) : [];

              return (
                <div
                  key={colIdx}
                  className={[
                    "min-h-[90px] p-1.5 border-r border-[#e9e9ef] last:border-0",
                    !day ? "bg-[#fafafa]" : "",
                  ].join(" ")}
                >
                  {day && (
                    <>
                      <span
                        className={[
                          "inline-flex items-center justify-center w-6 h-6 text-[13px] font-[500] rounded-full mb-1",
                          isToday
                            ? "bg-[#5849da] text-white font-[700]"
                            : "text-[#7b7b8b]",
                        ].join(" ")}
                      >
                        {day}
                      </span>
                      <div className="space-y-1">
                        {dayPosts.slice(0, 2).map((p) => (
                          <Link
                            key={p.id}
                            href={`/campaigns/${p.campaignId}/edit`}
                            title={`${p.title} — open to edit or reschedule`}
                            className={[
                              "block rounded-[4px] px-1.5 py-1 text-[11px] leading-tight hover:ring-1 hover:ring-current",
                              p.status === "PUBLISHED"
                                ? "bg-[#edf7f2] text-[#1a7a55]"
                                : p.status === "ACTION_REQUIRED"
                                ? "bg-[#fff3df] text-[#a6721d]"
                                : "bg-[#f0edff] text-[#5849da]",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              {p.platforms.slice(0, 2).map((pl) => (
                                <SocialPlatformBadge key={pl} platform={pl} size="sm" />
                              ))}
                              <span className="font-[600]">{manilaTime(p.scheduledAt)}</span>
                            </div>
                            <div className="font-[600] truncate">{p.title}</div>
                            <div>{p.status.charAt(0) + p.status.slice(1).toLowerCase().replaceAll("_", " ")}</div>
                          </Link>
                        ))}
                        {dayPosts.length > 2 && (
                          <div
                            className="text-[11px] text-[#7b7b8b] pl-1"
                            title={dayPosts.slice(2).map((p) => `${manilaTime(p.scheduledAt)} ${p.title}`).join("\n")}
                          >
                            +{dayPosts.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
