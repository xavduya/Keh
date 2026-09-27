import type { Availability } from "@/types";

const CONFIG: Record<Availability, { label: string; className: string }> = {
  ACTIVE: { label: "Available", className: "pill-published" },
  UNAVAILABLE: { label: "Unavailable", className: "pill-draft" },
};

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const { label, className } = CONFIG[availability];
  return (
    <span
      className={`inline-flex items-center rounded-[5px] text-[12px] font-semibold px-2 py-[3px] whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
