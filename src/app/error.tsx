"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

/**
 * Last-resort error page, outside the app shell. Catches what the
 * (dashboard) boundary can't — e.g. the layout's getCurrentContext() failing
 * because the account has no business.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="bg-white border border-brand-line rounded-[12px] p-8 max-w-[440px] text-center">
        <h1 className="font-heading text-[20px] font-bold text-brand-dark">Something went wrong</h1>
        <p className="text-[14px] text-brand-muted mt-2">
          Keh couldn&apos;t load your workspace. Try again, or log out and back in.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button onClick={() => retry()} className="h-9 px-4 text-[14px] font-semibold">
            Try again
          </Button>
          <form action={signOut}>
            <button type="submit" className="text-[14px] font-semibold text-brand hover:underline">
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
