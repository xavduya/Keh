"use client";

import { useState, type ComponentProps } from "react";
import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

function PendingHint() {
  const { pending } = useLinkStatus();
  return <span className="inline-flex h-3 w-3 shrink-0" role={pending ? "status" : undefined} aria-label={pending ? "Loading page" : undefined}>
    {pending && <LoaderCircle aria-hidden="true" size={12} className="motion-safe:animate-spin" />}
  </span>;
}

/** Warm only the destination the owner intends to visit, not every sidebar page. */
export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} prefetch={intent ? true : null} onMouseEnter={(event) => { setIntent(true); props.onMouseEnter?.(event); }} onFocus={(event) => { setIntent(true); props.onFocus?.(event); }}>
    {children}<PendingHint />
  </Link>;
}
