import Image from "next/image";
import Link from "next/link";
import {
  Sparkles, BarChart2, Calendar, Video, Tag, Clock,
  ChevronRight, Eye, Heart, FileText, Package, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SocialPlatformBadge, PlatformGroup } from "@/components/ui/social-platform-badge";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { getAnalyticsSummary, getInsights } from "@/services/analytics.service";
import { getPosts } from "@/services/campaign.service";
import { getConnectedAccounts } from "@/services/social-account.service";
import { timeLabel } from "@/utils";
import type { EnrichedPost } from "@/types";

const DEMO_DATE = "2026-09-26";

function groupPostsByDate(posts: EnrichedPost[]) {
  const today = posts.filter((p) => p.scheduledAt.startsWith(DEMO_DATE));
  const tomorrow = posts.filter((p) =>
    p.scheduledAt.startsWith("2026-09-27")
  );
  return { today, tomorrow };
}

function PostRow({ post }: { post: EnrichedPost }) {
  const time = post.scheduledAt.slice(11, 16);
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#e9e9ef] last:border-0">
      <span className="text-[13px] text-[#7b7b8b] w-16 shrink-0 font-[500]">
        {timeLabel(time)}
      </span>
      <div className="w-10 h-10 rounded-[6px] overflow-hidden shrink-0 relative">
        <Image
          src={post.product.imageUrl}
          alt={post.product.name}
          fill
          className="object-cover"
          sizes="40px"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-[600] text-[#262535] truncate">{post.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <PlatformGroup platforms={post.platforms} size="sm" />
          <span className="text-[12px] text-[#7b7b8b]">
            {post.platforms.map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" + ")}
          </span>
        </div>
      </div>
      <PostStatusBadge status={post.status} />
    </div>
  );
}

// Demo business ID — will come from Supabase session in Phase 5
const DEMO_BUSINESS_ID = "biz_001";

export default async function DashboardPage() {
  const [summary, posts, insights, connectedAccounts] = await Promise.all([
    getAnalyticsSummary(DEMO_BUSINESS_ID),
    getPosts(DEMO_BUSINESS_ID),
    getInsights(DEMO_BUSINESS_ID),
    getConnectedAccounts(DEMO_BUSINESS_ID),
  ]);

  const { today, tomorrow } = groupPostsByDate(posts);
  const actionRequired = posts.find((p) => p.status === "ACTION_REQUIRED");
  const connectedCount = connectedAccounts.length;

  const quickActions = [
    { label: "Promote a product", icon: Package },
    { label: "Announce something", icon: Sparkles },
    { label: "Create a promotion", icon: Tag },
    { label: "Keep my page active", icon: Heart },
    { label: "Create from scratch", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Good afternoon, Juan{" "}
            <span style={{ fontSize: 25 }}>👋</span>
          </>
        }
        subtitle="Here's what your social media looks like today."
        action={
          <span className="text-[13px] text-[#7b7b8b] flex items-center gap-2">
            <Calendar size={14} />
            Saturday, September 26, 2026
          </span>
        }
      />

      {/* Hero grid: recommendation + quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">

        {/* Recommendation card */}
        <div className="bg-white rounded-[12px] border border-[#e9e9ef] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 text-[#5849da] text-[12px] font-[700] uppercase tracking-[0.06em] mb-4">
              <Sparkles size={14} />
              Recommended for this week
            </div>
            <div className="flex gap-5">
              <div className="flex-1">
                <h2 className="font-heading text-[22px] font-[750] tracking-[-0.03em] text-[#262535] leading-[1.2] mb-3">
                  Give your Matcha Latte<br />a little more spotlight.
                </h2>
                <p className="text-[14px] text-[#7b7b8b] leading-relaxed mb-4">
                  Your last two Matcha posts received{" "}
                  <strong className="text-[#5849da]">38% more engagement</strong>{" "}
                  than your usual product posts. Let&apos;s keep the momentum going.
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { icon: Video, label: "Short video" },
                    { icon: Tag, label: "Show ₱150 price" },
                    { icon: null, label: "Casual Taglish" },
                    { icon: Clock, label: "Fri, 6:00 PM" },
                  ].map((t) => (
                    <span
                      key={t.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9e9ef] text-[13px] text-[#262535] bg-[#f7f8fb]"
                    >
                      {t.icon && <t.icon size={13} className="text-[#7b7b8b]" />}
                      {t.label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/campaigns/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
                >
                  <Sparkles size={15} />
                  Create Recommended Campaign
                </Link>
              </div>
              <div className="hidden sm:block relative w-[140px] h-[160px] rounded-[10px] overflow-hidden shrink-0">
                <Image
                  src={posts[0]?.product.imageUrl ?? ""}
                  alt="Matcha Latte"
                  fill
                  className="object-cover"
                  sizes="140px"
                  unoptimized
                />
              </div>
            </div>
          </div>
          <div className="border-t border-[#e9e9ef] px-6 py-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-[#7b7b8b]">
              <BarChart2 size={13} />
              Based on your recent performance
            </span>
            <button className="text-[13px] text-[#5849da] font-[600] hover:underline">
              Why this recommendation?
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
          <h3 className="font-heading font-[700] text-[16px] mb-4 text-[#262535]">
            What would you like to do?
          </h3>
          <div className="space-y-1">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href="/campaigns/new"
                className="flex items-center gap-3 px-3 py-3 rounded-[8px] hover:bg-[#f7f8fb] transition-colors group"
              >
                <span className="w-8 h-8 rounded-[8px] bg-[#f7f8fb] group-hover:bg-[#f0edff] flex items-center justify-center text-[#7b7b8b] group-hover:text-[#5849da] transition-colors shrink-0">
                  <a.icon size={15} />
                </span>
                <span className="flex-1 text-[14px] text-[#262535] font-[500]">
                  {a.label}
                </span>
                <ChevronRight size={14} className="text-[#b0b0be]" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-heading font-[700] text-[17px] text-[#262535]">
              A little progress, every day
            </h2>
            <span className="text-[13px] text-[#7b7b8b]">This month</span>
          </div>
          <Link
            href="/analytics"
            className="text-[13px] text-[#5849da] font-[600] flex items-center gap-1 hover:underline"
          >
            View insights →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="People reached"
            value={summary.totalReach.toLocaleString()}
            icon={<Eye size={16} />}
            growth={`↗ ${summary.reachGrowthPct}%`}
            bottom="vs. last month"
          />
          <StatCard
            label="Interactions"
            value={summary.totalInteractions.toLocaleString()}
            icon={<Heart size={16} />}
            growth={`↗ ${summary.interactionsGrowthPct}%`}
            bottom="vs. last month"
          />
          <StatCard
            label="Posts published"
            value="18"
            icon={<FileText size={16} />}
            bottom="Across your connected accounts"
          />
          <StatCard
            label="Best-performing product"
            value="Matcha Latte"
            icon={<Package size={16} />}
            bottom="A little green goes a long way"
            highlight
          />
        </div>
      </div>

      {/* Insight strip */}
      {insights[0] && (
        <div className="bg-[#f7f8fb] border border-[#e9e9ef] rounded-[10px] px-5 py-3 flex items-start gap-3">
          <Sparkles size={15} className="text-[#5849da] mt-0.5 shrink-0" />
          <p className="text-[13px] text-[#7b7b8b]">
            {insights[0]}
          </p>
        </div>
      )}

      {/* Coming up + sidebar widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">

        {/* Upcoming posts */}
        <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-[700] text-[17px] text-[#262535]">
              Coming up on your socials
            </h2>
            <Link
              href="/calendar"
              className="text-[13px] text-[#5849da] font-[600] flex items-center gap-1 hover:underline"
            >
              View calendar →
            </Link>
          </div>

          {today.length > 0 && (
            <>
              <p className="text-[11px] font-[700] text-[#7b7b8b] uppercase tracking-[0.07em] mb-1">
                Today · Sep 26
              </p>
              {today.map((p) => <PostRow key={p.id} post={p} />)}
            </>
          )}

          {tomorrow.length > 0 && (
            <>
              <p className="text-[11px] font-[700] text-[#7b7b8b] uppercase tracking-[0.07em] mt-4 mb-1">
                Tomorrow · Sep 27
              </p>
              {tomorrow.map((p) => <PostRow key={p.id} post={p} />)}
            </>
          )}
        </div>

        {/* Right widgets */}
        <div className="space-y-4">
          {/* Action required */}
          {actionRequired && (
            <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-[#a6721d]" />
                <h3 className="font-heading font-[700] text-[15px] text-[#262535]">
                  One quick thing before you go
                </h3>
              </div>
              <p className="text-[13px] text-[#7b7b8b] mb-3">
                Your TikTok video needs a finishing touch. Add your favorite audio
                and it&apos;s ready to go.
              </p>
              <Link
                href="/content"
                className="text-[13px] text-[#5849da] font-[600] flex items-center gap-1 hover:underline"
              >
                Review TikTok post →
              </Link>
            </div>
          )}

          {/* Connected accounts */}
          <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-[700] text-[15px] text-[#262535]">
                Your connected accounts
              </h3>
              <Link
                href="/social-accounts"
                className="text-[13px] text-[#5849da] font-[600] hover:underline"
              >
                Manage
              </Link>
            </div>
            <div className="flex gap-2 mb-2">
              {(["FACEBOOK", "INSTAGRAM", "TIKTOK"] as const).map((p) => (
                <div key={p} className="relative">
                  <SocialPlatformBadge platform={p} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23876c] border-2 border-white" />
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#7b7b8b]">
              {connectedCount} accounts connected · Sample sync just now
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
