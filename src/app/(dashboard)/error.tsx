"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/** Shown inside the app shell when a page fails to load (e.g. Supabase is unreachable). */
export default function DashboardError({
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
    <EmptyState
      title="This page didn't load"
      description="Something went wrong on our side. Your data is safe — try again in a moment."
      action={
        <div className="flex items-center gap-3">
          <Button onClick={() => retry()} className="h-9 px-4 text-[14px] font-semibold">
            Try again
          </Button>
          <Link href="/dashboard" className="text-[14px] font-semibold text-brand hover:underline">
            Go to Home
          </Link>
        </div>
      }
    />
  );
}
