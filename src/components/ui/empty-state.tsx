import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  /** If true, shows the purple sparkles icon treatment */
  ai?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  ai = false,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-[#e9e9ef] rounded-[10px] p-10 flex flex-col items-center text-center gap-4">
      {ai && <Sparkles size={32} className="text-[#5849da]" />}
      <div>
        <h2 className="font-heading text-[19px] font-[750] text-[#262535]">
          {title}
        </h2>
        <p className="text-[#7b7b8b] text-[15px] max-w-[420px] mt-1 mb-0">
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
