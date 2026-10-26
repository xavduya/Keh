"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { AssistantIntent } from "@/types";

/** Local feedback only: elapsed time is real, rather than invented model progress. */
export function AiLoading({ intent = "chat", onCancel, reveal = false }: {
  intent?: AssistantIntent; onCancel?: () => void; reveal?: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    // Reveal within the chat's scroll container without moving the whole page.
    if (reveal) {
      let parent = root.current?.parentElement;
      while (parent && parent !== document.body) {
        if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
          parent.scrollTop = parent.scrollHeight;
          break;
        }
        parent = parent.parentElement;
      }
    }
    return () => clearInterval(timer);
  }, [reveal]);
  const label = intent === "ideas" ? "Generating campaign ideas" : intent === "captions" ? "Writing your captions" : intent === "fill" ? "Preparing your campaign" : intent === "schedule" ? "Preparing a posting time" : "Keh is preparing your response";
  return (
    <div ref={root} className="my-3 min-w-0 rounded-xl border border-[#d8d2fb] bg-[#faf9ff] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#5849da]">
        <LoaderCircle aria-hidden="true" size={17} className="shrink-0 motion-safe:animate-spin" />
        <span role="status">{label}…</span>
        <span aria-hidden="true" className="ml-auto shrink-0 text-xs tabular-nums">{seconds}s</span>
      </div>
      <p className="mt-2 text-xs text-[#626274]">{seconds >= 20 ? "This is taking longer than usual. You can keep using the page while Keh finishes." : "You can keep browsing while Keh works."}</p>
      <div aria-hidden="true" className="mt-3 space-y-2 motion-safe:animate-pulse">
        <div className="h-2 w-full rounded bg-[#e8e4fb]" />
        <div className="h-2 w-4/5 rounded bg-[#e8e4fb]" />
        <div className="h-2 w-3/5 rounded bg-[#e8e4fb]" />
      </div>
      {onCancel && <button type="button" onClick={onCancel} className="mt-3 rounded border border-[#d8d2fb] bg-white px-3 py-1.5 text-xs font-semibold text-[#5849da] hover:bg-[#f0edff]">Stop generating</button>}
    </div>
  );
}
