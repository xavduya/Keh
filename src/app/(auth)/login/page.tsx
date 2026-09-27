import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const { error, deleted } = await searchParams;

  return (
    <>
      <h1 className="font-heading font-bold text-[22px] text-brand-dark mb-1">Welcome back</h1>
      <p className="text-[14px] text-brand-muted mb-6">
        Your business, in good hands.
      </p>

      {error === "confirm" && (
        <p className="text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
          That confirmation link didn&apos;t work. Try logging in, or sign up again.
        </p>
      )}
      {deleted === "1" && (
        <p className="text-[13px] text-brand bg-brand-light rounded-lg px-3 py-2 mb-4">
          Your account and all its data have been deleted.
        </p>
      )}
      {error === "reset" && (
        <p className="text-[13px] text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
          That reset link expired or was opened in a different browser.{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Send a new one
          </Link>
          .
        </p>
      )}

      <AuthForm
        action={login}
        submitLabel="Log in"
        pendingLabel="Logging in…"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />

      <p className="text-[13px] text-center mt-4">
        <Link href="/forgot-password" className="text-brand font-semibold hover:underline">
          Forgot your password?
        </Link>
      </p>

      <p className="text-[13px] text-brand-muted mt-6 text-center">
        New to Keh?{" "}
        <Link href="/signup" className="text-brand font-semibold hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
