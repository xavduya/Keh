"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/auth/context";
import { disconnectSocialAccount } from "@/services/social-account.service";
import type { Platform } from "@/types";

export async function disconnect(platform: Platform) {
  const { business } = await getCurrentContext();
  await disconnectSocialAccount(business.id, platform);
  revalidatePath("/social-accounts");
}
