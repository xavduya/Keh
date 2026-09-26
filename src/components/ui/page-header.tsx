import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-[28px] font-[750] tracking-[-0.03em] text-[#262535]">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-[#7b7b8b] text-[15px] mt-1 mb-0">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center shrink-0">{action}</div>
      )}
    </div>
  );
}
