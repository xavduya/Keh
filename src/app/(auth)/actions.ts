"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/request-origin";

export type AuthFormState =
  | {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | undefined;

const PasswordSchema = z.string().min(8, { error: "Use at least 8 characters." });

const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Enter your password." }),
});

const SignupSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Tell us your name." }),
  businessName: z.string().trim().min(1, { error: "What's your business called?" }),
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: PasswordSchema,
});

const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
});

const NewPasswordSchema = z
  .object({ password: PasswordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    error: "The passwords don't match.",
    path: ["confirmPassword"],
  });

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signup(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { fullName, businessName, email, password } = parsed.data;
  const origin = await requestOrigin();

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by handle_new_user() to name the profile and starter business.
      data: { full_name: fullName, business_name: businessName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    return { error: error.message };
  }

  // No session means the project requires email confirmation.
  if (!data.session) {
    return { message: `Almost there — check ${email} for a confirmation link.` };
  }

  redirect("/dashboard");
}

/** Emails a password-reset link that signs the user in on /reset-password. */
export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    // Rate limits and outages; don't reveal whether the email has an account.
    console.error("requestPasswordReset failed", error.message);
  }
  return {
    message: `If ${parsed.data.email} has a Keh account, a reset link is on its way. It works in this browser only.`,
  };
}

/** Sets a new password for the signed-in user (after a reset link, or from Settings). */
export async function updatePassword(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = NewPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link expired. Request a new one from the login page." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }
  return { message: "Your password has been changed." };
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
