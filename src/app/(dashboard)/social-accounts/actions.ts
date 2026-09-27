"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentContext } from "@/lib/auth/context";
import {
  SOCIAL_PLATFORMS,
  disconnectSocialAccount,
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
