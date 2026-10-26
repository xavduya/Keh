/** A stable, lightweight placeholder while the server loads page data. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-brand-line" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-28 rounded-xl border border-brand-line bg-white" />)}
        </div>
        <div className="h-64 rounded-xl border border-brand-line bg-white" />
      </div>
    </div>
  );
}

export function ShellSkeleton() {
  return <div className="min-h-dvh bg-brand-bg p-4 sm:p-6"><div className="mx-auto max-w-[1200px]"><PageSkeleton /></div></div>;
}
