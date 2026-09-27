import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { updatePassword } from "../actions";

/** Reached from the reset email via /auth/callback, which signs the user in. */
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="font-heading font-bold text-[22px] text-brand-dark mb-1">Choose a new password</h1>
      <p className="text-[14px] text-brand-muted mb-6">Use at least 8 characters.</p>

      <AuthForm
        action={updatePassword}
        submitLabel="Save new password"
        pendingLabel="Saving…"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          { name: "confirmPassword", label: "Confirm new password", type: "password", autoComplete: "new-password" },
        ]}
      />

      <p className="text-[13px] text-brand-muted mt-6 text-center">
        <Link href="/dashboard" className="text-brand font-semibold hover:underline">
          Continue to Keh
        </Link>
      </p>
    </>
  );
}
