import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="bg-white border border-brand-line rounded-[12px] p-8 max-w-[440px] text-center">
        <h1 className="font-heading text-[20px] font-bold text-brand-dark">Page not found</h1>
        <p className="text-[14px] text-brand-muted mt-2">
          This page doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:opacity-90"
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}
