import type { ReactNode } from "react";

interface HintBoxProps {
  children: ReactNode;
  className?: string;
}

export function HintBox({ children, className = "" }: HintBoxProps) {
  return (
    <div
      className={`bg-[#f0edff] text-[#5849da] rounded-lg px-4 py-3 text-[13px] ${className}`}
    >
      {children}
    </div>
  );
}
