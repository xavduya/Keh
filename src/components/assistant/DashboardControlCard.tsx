"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardControl } from "@/lib/ai/control-schema";
import { applyDashboardControl, reviewDashboardControl, type ControlReview } from "@/app/(dashboard)/assistant/control-actions";

export function DashboardControlCard({ control }: { control: DashboardControl }) {
  const router = useRouter();
  const lock = useRef(false);
  const [review, setReview] = useState<ControlReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [result, setResult] = useState<{ message: string; href: string } | null>(null);
  if (control.kind === "NAVIGATE") return <Link href={control.page} className="mt-3 inline-block font-semibold text-brand">Open {control.page.slice(1).replaceAll("-", " ")} →</Link>;

  async function prepare() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await reviewDashboardControl(control);
      if ("error" in response) setError(response.error);
      else setReview(response.review);
    } catch { setError("Couldn't load the latest values. Please try reviewing again."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function apply() {
    if (!review || lock.current || result) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await applyDashboardControl(control, review.revision, review.operationId);
      if ("error" in response) { setError(response.error); setReview(null); }
      else { setResult(response); router.refresh(); }
    } catch { setError("The connection was interrupted. Check the dashboard before submitting these changes again."); setCancelled(true); }
    finally { lock.current = false; setBusy(false); }
  }
  return (
    <section aria-label="Keh dashboard control" className="mt-3 w-full min-w-0 rounded-lg border border-brand/25 bg-white p-3 text-left text-brand-dark">
      <p className="text-xs font-bold text-brand">Keh AI Manager Control</p>
      {result ? <div role="status" className="mt-2 text-sm"><p>{result.message}</p><Link href={result.href} className="font-semibold text-brand">View changes →</Link></div> : cancelled ? <p className="mt-2 text-sm">Proposal closed. No further changes will be submitted.</p> : <>
        <p className="mt-1 text-sm font-semibold">{review?.title ?? control.kind.replaceAll("_", " ").toLowerCase()}</p>
        <p className="mt-1 text-xs text-brand-muted">Nothing is saved until you review and apply.</p>
        {review && <>
          <dl className="mt-3 max-h-64 space-y-3 overflow-y-auto text-xs">
            {review.changes.map((change) => <div key={change.field} className="break-words"><dt className="font-semibold">{change.field}</dt><dd className="mt-1 whitespace-pre-wrap text-brand-muted">Current: {change.before}</dd><dd className="mt-1 whitespace-pre-wrap">Proposed: {change.after}</dd></div>)}
          </dl>
          {review.warning && <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">{review.warning}</p>}
        </>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={review ? apply : prepare} className="rounded bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Working…" : review ? "Apply these changes" : "Review changes"}</button>
          <button type="button" disabled={busy} onClick={() => setCancelled(true)} className="rounded border border-brand-line px-3 py-2 text-xs">Cancel</button>
        </div>
      </>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
