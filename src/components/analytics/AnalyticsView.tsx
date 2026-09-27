"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Eye, Heart, Link2, FileText } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import {
  PERIOD_DAYS,
  filterByPlatform,
  findings,
  insights,
  measuredPosts,
  periodSummary,
  postDateKey,
  weeklyReach,
} from "@/lib/analytics";
import { formatDateKey } from "@/utils/datetime";
import type { Platform, PostPerformance } from "@/types";

const FILTERS = ["All", "Facebook", "Instagram", "TikTok"];
const PLATFORM_MAP: Record<string, Platform> = {
  Facebook: "FACEBOOK",
  Instagram: "INSTAGRAM",
  TikTok: "TIKTOK",
};

function growthLabel(pct: number | null) {
  if (pct === null) return undefined;
  return `${pct >= 0 ? "↗" : "↘"} ${Math.abs(pct)}% vs. previous ${PERIOD_DAYS} days`;
}

export function AnalyticsView({ posts, today }: { posts: PostPerformance[]; today: string }) {
  const [filter, setFilter] = useState("All");

  const visible = filterByPlatform(posts, PLATFORM_MAP[filter] ?? null);
  const summary = periodSummary(visible, today);
  const found = findings(visible);
  const insightLines = insights(found, summary);
  const chartData = weeklyReach(visible, today);
  const topPosts = measuredPosts(visible)
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 8);

  // Header highlight always describes all platforms.
  const overall = findings(posts);
  const hasResults = measuredPosts(posts).length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="A clearer picture of what works"
        subtitle="Simple insights. Better decisions. More time for your business."
        action={
          overall.bestProduct && (
            <div className="flex items-center gap-2 rounded-[8px] border border-[#e9e9ef] bg-white px-3 py-2">
              <Sparkles size={15} className="shrink-0 text-[#5849da]" />
              <div>
                <p className="text-[11px] font-[600] leading-tight text-[#7b7b8b]">
                  Top result
                </p>
                <p className="text-[13px] font-[700] leading-tight text-[#262535]">
                  {overall.bestProduct.value.name}
                  {overall.bestWindow && ` · ${overall.bestWindow.value}`}
                </p>
              </div>
            </div>
          )
        }
      />

      {!hasResults ? (
        <EmptyState
          ai
          title="Your results will show up here"
          description="Once your posts are live, Keh collects how many people they reached and how they responded, then tells you what's working."
          action={
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
            >
              Create a campaign
            </Link>
          }
        />
      ) : (
        <>
          <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} />

          {/* Metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="People reached"
              value={summary.current.reach.toLocaleString()}
              icon={<Eye size={16} />}
              growth={growthLabel(summary.reachGrowthPct)}
              trend={(summary.reachGrowthPct ?? 0) < 0 ? "down" : "up"}
              bottom={`Last ${PERIOD_DAYS} days`}
            />
            <StatCard
              label="Interactions"
              value={summary.current.interactions.toLocaleString()}
              icon={<Heart size={16} />}
              growth={growthLabel(summary.interactionsGrowthPct)}
              trend={(summary.interactionsGrowthPct ?? 0) < 0 ? "down" : "up"}
              bottom="Likes, comments, shares and saves"
            />
            <StatCard
              label="Link clicks"
              value={summary.current.clicks.toLocaleString()}
              icon={<Link2 size={16} />}
              bottom={`Last ${PERIOD_DAYS} days`}
            />
            <StatCard
              label="Posts published"
              value={summary.current.published}
              icon={<FileText size={16} />}
              bottom={
                found.avgReach > 0
                  ? `About ${found.avgReach.toLocaleString()} people per post`
                  : `Last ${PERIOD_DAYS} days`
              }
            />
          </div>

          {/* Chart + insights */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-heading font-[700] text-[17px] text-[#262535]">
                  {(summary.reachGrowthPct ?? 0) >= 0
                    ? "More people are finding you"
                    : "How many people you reached"}
                </h2>
                {summary.reachGrowthPct !== null && (
                  <span className="text-[12px] font-[600] bg-[#f0edff] text-[#5849da] px-2 py-1 rounded-md">
                    {summary.reachGrowthPct >= 0 ? "↑" : "↓"} {Math.abs(summary.reachGrowthPct)}%
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#7b7b8b] mb-4">
                {filter === "All" ? "All platforms" : filter} · Weekly reach, last 8 weeks
              </p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="30%">
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7b7b8b" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "#f0edff" }}
                      formatter={(v: unknown) => [`${Number(v).toLocaleString()} people`, "Reach"]}
                      labelFormatter={(label: unknown) => `Week of ${label}`}
                      contentStyle={{ border: "1px solid #e9e9ef", borderRadius: 8, fontSize: 13 }}
                    />
                    <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={i === chartData.length - 1 ? "#5849da" : "#c5bdf5"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[12px] text-[#7b7b8b] mt-3">
                Reach counts can include the same person across multiple posts.
              </p>
            </div>

            <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
              <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-4">
                Here&apos;s what worked
              </h2>
              {insightLines.length > 0 ? (
                <ul className="space-y-3">
                  {insightLines.map((s) => (
                    <li key={s} className="flex items-start gap-3 text-[14px] text-[#262535]">
                      <Sparkles size={14} className="text-[#5849da] mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-[#7b7b8b]">
                  Not enough results on {filter} yet to spot a pattern.
                </p>
              )}
              <p className="text-[12px] text-[#7b7b8b] mt-4">
                Observations from your posts, not proof of cause and effect.
              </p>
            </div>
          </div>

          {/* Performance table */}
          <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
            <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-1">
              Behind your best-performing content
            </h2>
            <p className="text-[13px] text-[#7b7b8b] mb-4">Little choices can make a difference.</p>
            {topPosts.length === 0 ? (
              <p className="text-[14px] text-[#7b7b8b]">No published {filter} posts with results yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e9e9ef]">
                      {["Post", "Platform", "Published", "Reach", "Interactions", "Clicks"].map((h) => (
                        <th key={h} scope="col" className="text-left py-2 px-3 text-[#7b7b8b] font-[600] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map((p) => (
                      <tr key={p.id} className="border-b border-[#e9e9ef] last:border-0 hover:bg-[#fafafa]">
                        <td className="py-3 px-3 font-[600] text-[#262535]">{p.title}</td>
                        <td className="py-3 px-3">
                          <SocialPlatformBadge platform={p.platform} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-[#7b7b8b] whitespace-nowrap">
                          {formatDateKey(postDateKey(p), { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-3 font-[700] text-[#262535]">{p.reach.toLocaleString()}</td>
                        <td className="py-3 px-3 text-[#262535]">{p.interactions.toLocaleString()}</td>
                        <td className="py-3 px-3 text-[#262535]">{p.clicks.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
