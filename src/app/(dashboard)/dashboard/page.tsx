import Image from "next/image";
import Link from "next/link";
import {
  Sparkles, Calendar, Tag, Megaphone,
  ChevronRight, Eye, Heart, FileText, Package, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SocialPlatformBadge, PlatformGroup } from "@/components/ui/social-platform-badge";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { getPosts } from "@/services/campaign.service";
import { getProducts } from "@/services/product.service";
import { findings, insights, periodSummary, postDateKey, recommendNextMove } from "@/lib/analytics";
import { getRecommendationState } from "@/services/recommendation.service";
import { RecommendationCard, type RecommendationCardData } from "@/components/dashboard/RecommendationCard";
import { toCardData } from "@/utils/recommendations";
import { getConnectedAccounts } from "@/services/social-account.service";
import { addDays, formatDateKey, manilaDateKey, manilaTime, manilaWeekdayHour, todayKey } from "@/utils/datetime";
import { getCurrentContext } from "@/lib/auth/context";
import type { CampaignGoal, EnrichedPost } from "@/types";

function groupPostsByDate(posts: EnrichedPost[], today: string) {
  const tomorrow = addDays(today, 1);
  const upcoming = posts.filter((p) => p.status !== "PUBLISHED" && p.status !== "DRAFT");
  return {
    today: upcoming.filter((p) => manilaDateKey(p.scheduledAt) === today),
    tomorrow: upcoming.filter((p) => manilaDateKey(p.scheduledAt) === tomorrow),
  };
}

function PostRow({ post }: { post: EnrichedPost }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#e9e9ef] last:border-0">
      <span className="text-[13px] text-[#7b7b8b] w-16 shrink-0 font-[500]">
        {manilaTime(post.scheduledAt)}
      </span>
      <div className="w-10 h-10 rounded-[6px] overflow-hidden shrink-0 relative bg-[#f7f8fb]">
        {post.product.imageUrl && (
          <Image
            src={post.product.imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
            unoptimized
          />
        )}
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

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function growthLabel(pct: number | null) {
  if (pct === null) return undefined;
  return `${pct >= 0 ? "↗" : "↘"} ${Math.abs(pct)}% vs. previous 30 days`;
}

const QUICK_ACTIONS: { label: string; icon: typeof Package; goal?: CampaignGoal }[] = [
  { label: "Promote a product", icon: Package, goal: "PROMOTE_PRODUCT" },
  { label: "Announce something", icon: Megaphone, goal: "ANNOUNCEMENT" },
  { label: "Create a promotion", icon: Tag, goal: "PROMOTION" },
  { label: "Keep my page active", icon: Heart, goal: "KEEP_PAGE_ACTIVE" },
  { label: "Create from scratch", icon: FileText },
];

export default async function DashboardPage() {
  const { user, business } = await getCurrentContext();
  const [posts, products, connectedAccounts, { recommendations, stale }] = await Promise.all([
    getPosts(business.id),
    getProducts(business.id),
    getConnectedAccounts(business.id),
    getRecommendationState(business.id),
  ]);
  const firstName = user.fullName.split(" ")[0];

  const todayDate = todayKey();
  const { today, tomorrow } = groupPostsByDate(posts, todayDate);
  const shortDate = (key: string) => formatDateKey(key, { month: "short", day: "numeric" });
  const actionRequired = posts.find((p) => p.status === "ACTION_REQUIRED");
  const connectedCount = connectedAccounts.length;

  const summary = periodSummary(posts, todayDate);
  const found = findings(posts);
  const insightLines = insights(found, summary);
  // This week's stored recommendation (AI or guided); until one exists, the
  // rules-based suggestion shows instantly while new ones are generated.
  const fallback = recommendNextMove(found, products);
  const card: RecommendationCardData = recommendations[0]
    ? toCardData(recommendations[0], products)
    : {
        ...fallback,
        basis: found.measuredCount > 0 ? "Based on your recent results" : "Based on your products",
        generatedByAi: false,
      };
  const upcomingCount = posts.filter(
    (p) => p.status === "SCHEDULED" && postDateKey(p) >= todayDate
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            {greeting(manilaWeekdayHour(new Date()).hour)}, {firstName}{" "}
            <span style={{ fontSize: 25 }}>👋</span>
          </>
        }
        action={
          <span className="text-[13px] text-[#7b7b8b] flex items-center gap-2">
            <Calendar size={14} />
            {formatDateKey(todayDate)}
          </span>
        }
      />

      {/* Hero grid: recommendation + quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">

        {/* Recommendation card */}
        <RecommendationCard data={card} stale={stale} />

        {/* Quick actions */}
        <div className="bg-white rounded-[12px] border border-[#e9e9ef] p-5">
          <h3 className="font-heading font-[700] text-[16px] mb-4 text-[#262535]">
            What would you like to do?
          </h3>
          <div className="space-y-1">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.goal ? `/campaigns/new?goal=${a.goal}` : "/campaigns/new"}
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
            <span className="text-[13px] text-[#7b7b8b]">Last 30 days</span>
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
            value={summary.current.reach.toLocaleString()}
            icon={<Eye size={16} />}
            growth={growthLabel(summary.reachGrowthPct)}
            trend={(summary.reachGrowthPct ?? 0) < 0 ? "down" : "up"}
            bottom={summary.current.reach === 0 ? "Results appear once posts go live" : undefined}
          />
          <StatCard
            label="Interactions"
            value={summary.current.interactions.toLocaleString()}
            icon={<Heart size={16} />}
            growth={growthLabel(summary.interactionsGrowthPct)}
            trend={(summary.interactionsGrowthPct ?? 0) < 0 ? "down" : "up"}
            bottom={summary.current.interactions === 0 ? "Likes, comments, shares and saves" : undefined}
          />
          <StatCard
            label="Posts published"
            value={summary.current.published}
            icon={<FileText size={16} />}
            bottom={upcomingCount > 0 ? `${upcomingCount} more scheduled` : "Nothing scheduled yet"}
          />
          <StatCard
            label="Best-performing product"
            value={found.bestProduct?.value.name ?? "—"}
            icon={<Package size={16} />}
            bottom={
              found.bestProduct
                ? `${found.bestProduct.avgReach.toLocaleString()} people per post`
                : "Needs a few published posts"
            }
            highlight={Boolean(found.bestProduct)}
          />
        </div>
      </div>

      {/* Insight strip */}
      {insightLines[0] && (
        <div className="bg-[#f7f8fb] border border-[#e9e9ef] rounded-[10px] px-5 py-3 flex items-start gap-3">
          <Sparkles size={15} className="text-[#5849da] mt-0.5 shrink-0" />
          <p className="text-[13px] text-[#7b7b8b]">
            {insightLines[0]}
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
                Today · {shortDate(todayDate)}
              </p>
              {today.map((p) => <PostRow key={p.id} post={p} />)}
            </>
          )}

          {today.length === 0 && tomorrow.length === 0 && (
            <p className="text-[14px] text-[#7b7b8b] py-6 text-center">
              Nothing scheduled for today or tomorrow.{" "}
              <Link href="/campaigns/new" className="text-[#5849da] font-[600] hover:underline">
                Plan a campaign
              </Link>
            </p>
          )}

          {tomorrow.length > 0 && (
            <>
              <p className="text-[11px] font-[700] text-[#7b7b8b] uppercase tracking-[0.07em] mt-4 mb-1">
                Tomorrow · {shortDate(addDays(todayDate, 1))}
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
              {(["FACEBOOK", "INSTAGRAM", "TIKTOK"] as const).map((p) => {
                const isConnected = connectedAccounts.some((a) => a.platform === p);
                return (
                  <div key={p} className={`relative ${isConnected ? "" : "opacity-40"}`} title={isConnected ? "Connected" : "Not connected"}>
                    <SocialPlatformBadge platform={p} size="md" />
                    {isConnected && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23876c] border-2 border-white" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[12px] text-[#7b7b8b]">
              {connectedCount === 0
                ? "No accounts connected yet"
                : `${connectedCount} of 3 accounts connected`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
