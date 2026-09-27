import { LoaderCircle } from "lucide-react";

/** Shown inside the app shell while a page's data loads. */
export default function Loading() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-[14px] text-brand-muted">
      <LoaderCircle size={18} className="animate-spin text-brand" />
      Loading…
    </div>
  );
}
