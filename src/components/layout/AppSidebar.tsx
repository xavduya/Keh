"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Sparkles, Plus, Calendar, FileText, Package,
  BarChart2, Layers, Link as LinkIcon, CreditCard, Settings,
  Coffee, ChevronDown, X,
} from "lucide-react";
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from "@/constants";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Home, Sparkles, Plus, Calendar, FileText, Package,
  BarChart2, Layers, Link: LinkIcon, CreditCard, Settings,
};

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  businessName: string;
  businessLocation: string;
}

export function AppSidebar({ isOpen, onClose, businessName, businessLocation }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          "fixed top-0 left-0 h-full w-[240px] bg-white border-r border-[#e9e9ef] z-40",
          "flex flex-col overflow-y-auto",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-[#7b7b8b] hover:bg-[#f7f8fb] lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>

        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 pt-5 pb-4 text-[22px] font-[800] tracking-[-0.04em] font-heading text-[#262535]"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          <span className="w-8 h-8 rounded-[10px] bg-[#5849da] flex items-center justify-center text-white text-[18px] font-[800] shrink-0">
            k
          </span>
          keh
          <span className="text-[#5849da]">.</span>
        </Link>

        {/* Business card */}
        <div className="mx-3 mb-3 px-3 py-2 rounded-[10px] bg-[#f7f8fb] flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5849da] flex items-center justify-center shrink-0">
            <Coffee size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-[600] text-[#262535] leading-tight truncate">
              {businessName}
            </p>
            <p className="text-[11px] text-[#7b7b8b] leading-tight truncate">
              {businessLocation}
            </p>
          </div>
        </div>

        {/* Create campaign button */}
        <div className="px-3 mb-4">
          <Link
            href="/campaigns/new"
            className="flex items-center justify-center gap-2 w-full py-[10px] px-4 rounded-[8px] bg-[#5849da] text-white text-[14px] font-[600] hover:bg-[#4a3cc7] transition-colors"
          >
            <Plus size={16} />
            Create Campaign
          </Link>
        </div>

        {/* Main nav */}
        <p className="px-5 text-[10px] font-[700] text-[#7b7b8b] tracking-[0.08em] uppercase mb-2">
          Your Workspace
        </p>
        <nav className="flex-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-[9px] rounded-[8px] text-[14px] font-[500] mb-[2px] transition-colors",
                  isActive
                    ? "bg-[#f0edff] text-[#5849da] font-[600]"
                    : "text-[#262535] hover:bg-[#f7f8fb]",
                ].join(" ")}
              >
                {Icon && (
                  <Icon
                    size={18}
                    className={isActive ? "text-[#5849da]" : "text-[#7b7b8b]"}
                  />
                )}
                <span className="flex-1 leading-tight">{item.label}</span>
                {item.aiBadge && (
                  <span className="text-[10px] font-[700] bg-[#5849da] text-white rounded px-[5px] py-[2px]">
                    AI
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="px-2 pt-2 border-t border-[#e9e9ef] mt-2">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-[9px] rounded-[8px] text-[14px] font-[500] mb-[2px] transition-colors",
                  isActive
                    ? "bg-[#f0edff] text-[#5849da] font-[600]"
                    : "text-[#262535] hover:bg-[#f7f8fb]",
                ].join(" ")}
              >
                {Icon && (
                  <Icon
                    size={18}
                    className={isActive ? "text-[#5849da]" : "text-[#7b7b8b]"}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User row */}
        <Link
          href="/settings"
          className="flex items-center gap-3 mx-2 my-2 px-3 py-[10px] rounded-[10px] hover:bg-[#f7f8fb] transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5849da] flex items-center justify-center text-[11px] font-[700] shrink-0">
            JD
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-[600] text-[#262535] leading-tight truncate">
              Juan Dela Cruz
            </p>
            <p className="text-[11px] text-[#7b7b8b] leading-tight">
              Business owner
            </p>
          </div>
          <ChevronDown size={14} className="text-[#7b7b8b] shrink-0" />
        </Link>
      </aside>
    </>
  );
}
