"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import type { AuthFormState } from "@/app/(auth)/actions";
import { getCurrentContext } from "@/lib/auth/context";
import { requestOrigin } from "@/lib/request-origin";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { deleteBusinessImages } from "@/services/storage.service";

const ChangeEmailSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
});

/** Starts an email change; Supabase emails a confirmation link (to both addresses by default). */
export async function changeEmail(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { user } = await getCurrentContext();
  const parsed = ChangeEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (parsed.data.email.toLowerCase() === user.email.toLowerCase()) {
    return { fieldErrors: { email: ["That's already your email."] } };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/settings` }
  );
  if (error) return { error: error.message };
  return {
    message: `Check ${parsed.data.email} (and your current inbox) for a confirmation link. Your email changes once it's confirmed.`,
  };
}

/**
 * Permanently deletes the signed-in user and everything they own.
 *
 * Campaigns go first: campaigns reference products with ON DELETE RESTRICT,
 * so letting the auth-user cascade (profiles → businesses → products,
 * campaigns) delete them in one go can fail. Then the images, then the auth
 * user, whose cascade removes the rest (businesses, products, social
 * accounts and tokens, subscription, AI data).
 */
export async function deleteAccount(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { user } = await getCurrentContext();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { fieldErrors: { confirm: ["Type DELETE to confirm."] } };
  }

  const admin = createAdminClient();
  try {
    const { data: businesses, error } = await admin.from("businesses").select("id").eq("owner_id", user.id);
    if (error) throw error;

    for (const { id } of businesses) {
      const { error: campaignsError } = await admin.from("campaigns").delete().eq("business_id", id);
      if (campaignsError) throw campaignsError;
      await deleteBusinessImages(id);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
  } catch (err) {
    console.error("deleteAccount failed", err);
    return { error: "We couldn't delete your account. Please try again, or contact support." };
  }

  // The user no longer exists, so only clear this browser's session cookies.
  const supabase = await createServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
