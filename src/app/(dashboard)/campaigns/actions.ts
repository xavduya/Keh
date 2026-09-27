"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { CampaignDraftSchema } from "@/lib/validation/schemas";
import { createCampaignWithPosts } from "@/services/campaign.service";
import { getProductById } from "@/services/product.service";
import {
  consumeCampaignQuota,
  getSubscription,
  releaseCampaignQuota,
} from "@/services/business.service";
import { formatManilaDate } from "@/utils/datetime";
import { goalLabel } from "@/constants";
import { manilaToUtcIso } from "@/utils/datetime";
import type { CampaignDraft, PostStatus } from "@/types";

/**
 * schedule — posts go out at the chosen date/time
 * publish  — posts are queued for right now (no live publishing yet)
 * draft    — saved for later, nothing is scheduled
 */
export type SaveIntent = "schedule" | "publish" | "draft";

export async function saveCampaign(
  draft: CampaignDraft,
  intent: SaveIntent
): Promise<{ error: string }> {
  const { business } = await getCurrentContext();

  const parsed = CampaignDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your campaign." };
  }
  const data = parsed.data;
  const platforms = [...new Set(data.platforms)];

  const product = await getProductById(data.productId);
  if (!product || product.businessId !== business.id) {
    return { error: "That product no longer exists. Pick another one." };
  }
  if (product.availability !== "ACTIVE") {
    return { error: `${product.name} isn't available right now. Pick another product.` };
  }

  const missingCaption = platforms.find((p) => !data.captions[p]);
  if (missingCaption) {
    return { error: "Every selected platform needs a caption." };
  }

  let scheduledAt: string;
  if (intent === "schedule") {
    if (!data.scheduledDate || !data.scheduledTime) {
      return { error: "Choose a date and time to schedule your campaign." };
    }
    scheduledAt = manilaToUtcIso(data.scheduledDate, data.scheduledTime);
    if (new Date(scheduledAt) <= new Date()) {
      return { error: "That time has already passed. Choose a time in the future." };
    }
  } else if (intent === "draft" && data.scheduledDate && data.scheduledTime) {
    scheduledAt = manilaToUtcIso(data.scheduledDate, data.scheduledTime);
  } else {
    scheduledAt = new Date().toISOString();
  }

  const statusFor = (platform: string): PostStatus => {
    if (intent === "draft") return "DRAFT";
    // TikTok can't be auto-published: the owner adds audio and posts manually.
    return platform === "TIKTOK" ? "ACTION_REQUIRED" : "SCHEDULED";
  };

  // Every saved campaign uses one of the plan's monthly AI campaigns;
  // scheduled posts (not drafts) use its monthly scheduled posts.
  const scheduledPosts = intent === "draft" ? 0 : platforms.length;
  const quota = await consumeCampaignQuota(business.id, scheduledPosts);
  if (!quota.allowed) {
    return { error: await quotaMessage(business.id, quota.reason) };
  }

  try {
    await createCampaignWithPosts(business.id, {
      goal: data.goal,
      product,
      promotion: data.promotion,
      duration: data.duration,
      instructions: data.instructions,
      title: `${product.name} · ${goalLabel(data.goal)}`,
      scheduledAt,
      posts: platforms.map((platform) => ({
        platform,
        caption: data.captions[platform]!,
        status: statusFor(platform),
      })),
    });
  } catch (err) {
    console.error("saveCampaign failed", err);
    if (!("unavailable" in quota)) await releaseCampaignQuota(business.id, scheduledPosts);
    return { error: "We couldn't save your campaign. Please try again." };
  }

  for (const path of ["/campaigns", "/calendar", "/content", "/dashboard", "/products", "/subscription"]) {
    revalidatePath(path);
  }
  redirect("/campaigns");
}

async function quotaMessage(
  businessId: string,
  reason: "ai_campaigns" | "scheduled_posts" | "not_owner" | "no_subscription"
): Promise<string> {
  if (reason === "not_owner" || reason === "no_subscription") {
    return "We couldn't find your plan. Please refresh the page and try again.";
  }
  const sub = await getSubscription(businessId);
  const resets = sub ? ` It resets on ${formatManilaDate(sub.usage.resetsAt, { month: "long", day: "numeric" })}.` : "";
  if (reason === "ai_campaigns") {
    return `You've used all ${sub?.usage.aiCampaignsLimit ?? ""} campaigns in your plan this month.${resets} Upgrade your plan to keep creating.`.replace("  ", " ");
  }
  const left = sub ? Math.max(sub.usage.scheduledPostsLimit - sub.usage.scheduledPostsUsed, 0) : 0;
  return `This would go over your plan's scheduled posts (${left} left this month).${resets} Pick fewer platforms, save it as a draft, or upgrade your plan.`;
}
