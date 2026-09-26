import type { PostStatus } from "@/types";

interface PostStatusBadgeProps {
  status: PostStatus;
}

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "pill-draft",
  },
  SCHEDULED: {
    label: "Scheduled",
    className: "pill-scheduled",
  },
  PUBLISHED: {
    label: "✓ Published",
    className: "pill-published",
  },
  ACTION_REQUIRED: {
    label: "Action Required",
    className: "pill-action-required",
  },
  PUBLISHING: {
    label: "Publishing",
    className: "pill-scheduled",
  },
  FAILED: {
    label: "Failed",
    className: "pill-failed",
  },
};

export function PostStatusBadge({ status }: PostStatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[5px] text-[12px] font-semibold px-2 py-[3px] whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
