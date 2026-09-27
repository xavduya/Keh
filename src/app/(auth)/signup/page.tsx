import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { signup } from "../actions";

export default function SignupPage() {
  return (
    <>
      <h1 className="font-heading font-bold text-[22px] text-brand-dark mb-1">
        Let&apos;s get you set up
      </h1>
      <p className="text-[14px] text-brand-muted mb-6">
        You run the business. We&apos;ll handle the posting.
      </p>

      <AuthForm
        action={signup}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        fields={[
          { name: "fullName", label: "Your name", autoComplete: "name" },
          { name: "businessName", label: "Business name", autoComplete: "organization", placeholder: "e.g. Juan's Café" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
      />

      <p className="text-[13px] text-brand-muted mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
