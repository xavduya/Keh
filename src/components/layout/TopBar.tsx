"use client";

import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from "@/constants";

const ALL_NAV = [...NAV_ITEMS, ...BOTTOM_NAV_ITEMS];

function getPageTitle(pathname: string): string {
  // Exact match first
  const exact = ALL_NAV.find((n) => n.href === pathname);
  if (exact) return exact.label;

  // Prefix match (for nested routes)
  const prefix = ALL_NAV.find(
    (n) => n.href !== "/dashboard" && pathname.startsWith(n.href)
  );
  if (prefix) return prefix.label;

  if (pathname === "/dashboard") return "Home";
  return "Keh";
}

interface TopBarProps {
  onMenuClick: () => void;
  userInitials: string;
}

export function TopBar({ onMenuClick, userInitials }: TopBarProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="h-[56px] bg-white border-b border-[#e9e9ef] flex items-center justify-between px-5 sticky top-0 z-20 shrink-0">
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-[#7b7b8b] hover:bg-[#f7f8fb] transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        <span className="text-[14px] font-[600] text-[#262535]">
          {pageTitle}
        </span>
      </div>

      {/* Right: demo badge + tagline + bell + avatar */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-[#f0edff] text-[#5849da] text-[12px] font-[600]">
          Interactive demo
        </span>
        <span className="hidden md:block text-[13px] text-[#7b7b8b]">
          Your business, in good hands.
        </span>
        <div className="w-px h-4 bg-[#e9e9ef] hidden sm:block" />
        <button
          className="p-1.5 rounded-lg text-[#7b7b8b] hover:bg-[#f7f8fb] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <span className="w-[30px] h-[30px] rounded-full bg-[#f0edff] text-[#5849da] text-[11px] font-[700] flex items-center justify-center">
          {userInitials}
        </span>
      </div>
    </header>
  );
}
