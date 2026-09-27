"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth/context";
import { CampaignDraftSchema } from "@/lib/validation/schemas";
import {
  createCampaignWithPosts,
  deleteCampaign,
  getCampaignWithPosts,
  markPostedManually,
  updateCampaignWithPosts,
} from "@/services/campaign.service";
import { getProductById } from "@/services/product.service";
import {
  consumeCampaignQuota,
  consumeScheduledPostQuota,
  getSubscription,
  releaseCampaignQuota,
} from "@/services/business.service";
import { formatManilaDate } from "@/utils/datetime";
import { goalLabel } from "@/constants";
import { isCampaignEditable } from "@/utils";
import { publishDuePosts } from "@/services/publishing.service";
import { isPublishingEnabled } from "@/lib/env";
import { manilaToUtcIso } from "@/utils/datetime";
import type { CampaignDraft, PostStatus } from "@/types";

/**
 * schedule — posts go out at the chosen date/time (the publish job, every 5 minutes)
 * publish  — posts go out right away (only with PUBLISHING_ENABLED; otherwise saved for now)
 * draft    — saved for later, nothing is scheduled
 */
export type SaveIntent = "schedule" | "publish" | "draft";

const CAMPAIGN_PAGES = ["/campaigns", "/calendar", "/content", "/dashboard", "/products", "/subscription", "/analytics"];

function revalidateCampaignPages() {
  for (const path of CAMPAIGN_PAGES) revalidatePath(path);
}

/** Creates a campaign, or updates the one in `draft.editId`. */
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

  const editId = typeof draft.editId === "string" && draft.editId ? draft.editId : null;
  const existing = editId ? await getCampaignWithPosts(business.id, editId) : null;
  if (editId && !existing) {
    return { error: "That campaign no longer exists." };
  }
  if (existing && !isCampaignEditable(existing.posts)) {
    return { error: "This campaign has already been published, so it can't be changed." };
  }

  const product = await getProductById(data.productId);
  if (!product || product.businessId !== business.id) {
    return { error: "That product no longer exists. Pick another one." };
  }
  // An edit may keep a product that has since become unavailable.
  const keepsProduct = existing?.productId === product.id;
  if (product.availability !== "ACTIVE" && !keepsProduct) {
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

  const input = {
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
  };
  const scheduledPosts = intent === "draft" ? 0 : platforms.length;
  let campaignId: string;

  if (existing) {
    // Editing isn't a new campaign: only posts scheduled beyond what the
    // campaign already had count against the plan.
    const alreadyScheduled = existing.posts.filter((p) => p.status !== "DRAFT").length;
    const quota = await consumeScheduledPostQuota(business.id, scheduledPosts - alreadyScheduled);
    if (!quota.allowed) {
      return { error: await quotaMessage(business.id, quota.reason) };
    }
    try {
      await updateCampaignWithPosts(business.id, existing.id, input);
      campaignId = existing.id;
    } catch (err) {
      console.error("saveCampaign (edit) failed", err);
      return { error: "We couldn't save your changes. Please try again." };
    }
  } else {
    // Every new campaign uses one of the plan's monthly AI campaigns;
    // scheduled posts (not drafts) use its monthly scheduled posts.
    const quota = await consumeCampaignQuota(business.id, scheduledPosts);
    if (!quota.allowed) {
      return { error: await quotaMessage(business.id, quota.reason) };
    }
    try {
      campaignId = await createCampaignWithPosts(business.id, input);
    } catch (err) {
      console.error("saveCampaign failed", err);
      if (!("unavailable" in quota)) await releaseCampaignQuota(business.id, scheduledPosts);
      return { error: "We couldn't save your campaign. Please try again." };
    }
  }

  if (intent === "publish" && isPublishingEnabled()) {
    // Post now instead of waiting for the next job run. Each post ends up
    // PUBLISHED or FAILED with a reason the owner sees on /campaigns.
    try {
      await publishDuePosts({ campaignId });
    } catch (err) {
      console.error("Publish now failed; the publish job will retry", err);
    }
  }

  revalidateCampaignPages();
  redirect("/campaigns");
}

/**
 * Deletes a campaign and its posts from Keh. Posts already published on
 * Facebook / Instagram stay there. Plan usage isn't given back.
 */
export async function removeCampaign(campaignId: string): Promise<{ error?: string }> {
  const { business } = await getCurrentContext();
  if (typeof campaignId !== "string" || !campaignId) return { error: "That campaign no longer exists." };
  try {
    await deleteCampaign(business.id, campaignId);
  } catch (err) {
    console.error("removeCampaign failed", err);
    return { error: "We couldn't delete that campaign. Please try again." };
  }
  revalidateCampaignPages();
  return {};
}

/** "I posted it": the owner posted a TikTok post themselves. */
export async function markTikTokPosted(postId: string): Promise<{ error?: string }> {
  await getCurrentContext();
  try {
    if (typeof postId !== "string" || !(await markPostedManually(postId))) {
      return { error: "That post was already marked as posted." };
    }
  } catch (err) {
    console.error("markTikTokPosted failed", err);
    return { error: "We couldn't update that post. Please try again." };
  }
  revalidateCampaignPages();
  return {};
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
