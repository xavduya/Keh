"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export type AuthFormState =
  | {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | undefined;

const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Enter your password." }),
});

const SignupSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Tell us your name." }),
  businessName: z.string().trim().min(1, { error: "What's your business called?" }),
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z.string().min(8, { error: "Use at least 8 characters." }),
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
  // Where the confirmation link sends the user back to. Some browsers omit
  // Origin on same-origin posts, so fall back to the Host header.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = requestHeaders.get("origin") ?? (host ? `${proto}://${host}` : "");

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

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
