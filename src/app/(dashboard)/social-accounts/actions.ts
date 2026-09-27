"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentContext } from "@/lib/auth/context";
import { getPages } from "@/lib/social/meta";
import { PAGE_PICK_COOKIE, PAGE_PICK_COOKIE_PATH, decodePagePick } from "@/lib/social/oauth-state";
import {
  SOCIAL_PLATFORMS,
  disconnectSocialAccount,
  saveMetaPage,
  upsertSocialAccount,
} from "@/services/social-account.service";
import type { Platform } from "@/types";

function revalidate() {
  revalidatePath("/social-accounts");
  revalidatePath("/dashboard");
}

/** Disconnects a platform and deletes its stored token. */
export async function disconnect(platform: Platform): Promise<{ error?: string }> {
  const { business } = await getCurrentContext();
  if (!SOCIAL_PLATFORMS.includes(platform)) return { error: "Unknown platform." };
  try {
    await disconnectSocialAccount(business.id, platform);
  } catch (err) {
    console.error("disconnect failed", err);
    return { error: "We couldn't disconnect that account. Please try again." };
  }
  revalidate();
  return {};
}

const TikTokHandleSchema = z
  .string()
  .trim()
  .regex(/^@?[A-Za-z0-9._]{2,24}$/, "Enter your TikTok username, e.g. @juanscafe");

/**
 * TikTok has no publishing API for Keh: the owner posts manually. Saving the
 * username lets Keh prepare TikTok posts (marked "Action required").
 */
export async function connectTikTok(handle: string): Promise<{ error?: string }> {
  const { business } = await getCurrentContext();
  const parsed = TikTokHandleSchema.safeParse(handle);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const username = parsed.data.startsWith("@") ? parsed.data : `@${parsed.data}`;
  try {
    await upsertSocialAccount(business.id, { platform: "TIKTOK", accountName: username });
  } catch (err) {
    console.error("connectTikTok failed", err);
    return { error: "We couldn't save your TikTok account. Please try again." };
  }
  revalidate();
  return {};
}

/** Saves the Facebook Page (or its Instagram account) picked on /social-accounts/choose. */
export async function choosePage(formData: FormData): Promise<void> {
  const { business } = await getCurrentContext();
  const cookieStore = await cookies();
  const pick = decodePagePick(cookieStore.get(PAGE_PICK_COOKIE)?.value);
  if (!pick) redirect("/social-accounts?error=expired");

  const pageId = String(formData.get("pageId") ?? "");
  let error: string | null = null;
  try {
    // Re-read the Pages rather than trusting anything from the form.
    const page = (await getPages(pick.userToken)).find((p) => p.id === pageId);
    if (!page || (pick.platform === "INSTAGRAM" && !page.instagram_business_account)) {
      error = "expired";
    } else {
      await saveMetaPage(business.id, pick.platform, page);
    }
  } catch (err) {
    console.error("choosePage failed", err);
    error = "failed";
  }

  cookieStore.delete({ name: PAGE_PICK_COOKIE, path: PAGE_PICK_COOKIE_PATH });
  revalidate();
  redirect(error ? `/social-accounts?error=${error}` : "/social-accounts?connected=1");
}
