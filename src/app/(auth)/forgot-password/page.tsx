import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-heading font-bold text-[22px] text-brand-dark mb-1">Reset your password</h1>
      <p className="text-[14px] text-brand-muted mb-6">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        pendingLabel="Sending…"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />

      <p className="text-[13px] text-brand-muted mt-6 text-center">
        Remembered it?{" "}
        <Link href="/login" className="text-brand font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
