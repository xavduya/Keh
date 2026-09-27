"use client";

import { useState } from "react";
import { Sparkles, Eye, Heart, Link2, Users } from "lucide-react";
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
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import type { AnalyticsSummary, WeeklyReachPoint } from "@/data/mock-analytics";
import type { EnrichedPost } from "@/types";

const FILTERS = ["All", "Facebook", "Instagram", "TikTok"];

function applyPlatformRatio(
  value: number,
  filter: string,
  ratio: Record<string, number>
): number {
  if (filter === "All") return value;
  return Math.round(value * (ratio[filter.toUpperCase()] ?? 1));
}

export function AnalyticsView({
  summary,
  weeklyReach,
  insights,
  posts,
  platformReachRatio,
}: {
  summary: AnalyticsSummary;
  weeklyReach: WeeklyReachPoint[];
  insights: string[];
  posts: EnrichedPost[];
  platformReachRatio: Record<string, number>;
}) {
  const [filter, setFilter] = useState("All");

  const reach = applyPlatformRatio(summary.totalReach, filter, platformReachRatio);
  const interactions = applyPlatformRatio(summary.totalInteractions, filter, platformReachRatio);
  const clicks = applyPlatformRatio(summary.totalLinkClicks, filter, platformReachRatio);
  const followers = applyPlatformRatio(summary.followerCount, filter, platformReachRatio);

  const chartData = weeklyReach.map((d) => ({
    ...d,
    reach: applyPlatformRatio(d.reach, filter, platformReachRatio),
  }));

  const topPosts = posts
    .filter((p) => p.reach > 0)
    .sort((a, b) => b.reach - a.reach);

  return (
    <div className="space-y-5">
      <PageHeader
        title="A clearer picture of what works"
        subtitle="Simple insights. Better decisions. More time for your business."
        action={
          <span className="text-[13px] text-[#7b7b8b]">
            {summary.period} · Sample data
          </span>
        }
      />

      <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} />

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="People reached" value={reach.toLocaleString()} icon={<Eye size={16} />} growth={`↑ ${summary.reachGrowthPct}% this month`} />
        <StatCard label="Interactions" value={interactions.toLocaleString()} icon={<Heart size={16} />} growth={`↑ ${summary.interactionsGrowthPct}% this month`} />
        <StatCard label="Link clicks" value={clicks.toLocaleString()} icon={<Link2 size={16} />} bottom="Across your connected accounts" />
        <StatCard label="Followers" value={followers.toLocaleString()} icon={<Users size={16} />} bottom="A growing community" />
      </div>

      {/* Chart + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Bar chart */}
        <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-heading font-[700] text-[17px] text-[#262535]">
              More people are finding you
            </h2>
            <span className="text-[12px] font-[600] bg-[#f0edff] text-[#5849da] px-2 py-1 rounded-md">
              ↑ {summary.reachGrowthPct}% this month
            </span>
          </div>
          <p className="text-[13px] text-[#7b7b8b] mb-4">
            {filter === "All" ? "All platforms" : filter} · Weekly reach
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7b7b8b" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "#f0edff" }}
                  formatter={(v: unknown) => [`${Number(v).toLocaleString()} people`, "Reach"]}
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

        {/* What worked */}
        <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
          <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-4">
            Here&apos;s what worked
          </h2>
          <ul className="space-y-3">
            {insights.map((s) => (
              <li key={s} className="flex items-start gap-3 text-[14px] text-[#262535]">
                <Sparkles size={14} className="text-[#5849da] mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-[#7b7b8b] mt-4">
            Sample insights · Observations, not proof of causation
          </p>
        </div>
      </div>

      {/* Performance table */}
      <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
        <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-1">
          Behind your best-performing content
        </h2>
        <p className="text-[13px] text-[#7b7b8b] mb-4">Little choices can make a difference.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#e9e9ef]">
                {["Campaign", "Platform", "Status", "Reach"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[#7b7b8b] font-[600] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPosts.map((p) => (
                <tr key={p.id} className="border-b border-[#e9e9ef] last:border-0 hover:bg-[#fafafa]">
                  <td className="py-3 px-3">
                    <span className="font-[600] text-[#262535]">{p.title}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1">
                      {p.platforms.map((pl) => (
                        <SocialPlatformBadge key={pl} platform={pl} size="sm" />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[#7b7b8b]">
                    {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                  </td>
                  <td className="py-3 px-3 font-[700] text-[#262535]">
                    {p.reach.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
