import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  bottom?: string;
  highlight?: boolean;
  growth?: string;
}

export function StatCard({
  label,
  value,
  icon,
  bottom,
  highlight = false,
  growth,
}: StatCardProps) {
  return (
    <div className="bg-white border border-[#e9e9ef] rounded-[10px] p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[13px] text-[#7b7b8b]">{label}</span>
        <span className="text-[#7b7b8b]">{icon}</span>
      </div>
      <div
        className={`font-heading text-[28px] font-[750] tracking-[-0.03em] leading-none ${
          highlight ? "text-[#5849da]" : "text-[#262535]"
        }`}
      >
        {value}
      </div>
      {growth && (
        <div className="text-[#23876c] text-[13px] font-semibold mt-1">
          {growth}
        </div>
      )}
      {bottom && (
        <div className="text-[13px] text-[#7b7b8b] mt-1">{bottom}</div>
      )}
    </div>
  );
}
