import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words font-heading text-[24px] sm:text-[28px] font-[750] tracking-[-0.03em] text-[#262535]">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-[#7b7b8b] text-[15px] mt-1 mb-0">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex max-w-full flex-wrap items-center gap-2 sm:shrink-0">{action}</div>
      )}
    </div>
  );
}
