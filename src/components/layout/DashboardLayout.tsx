"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { initials } from "@/utils";
const MarketingManagerCopilot = dynamic(() => import("@/components/assistant/MarketingManagerCopilot").then((m) => m.MarketingManagerCopilot));
import { LiveRefresh } from "./LiveRefresh";

interface DashboardLayoutProps {
  aiEnabled: boolean;
  children: React.ReactNode;
  businessId: string;
  businessName: string;
  businessLocation: string;
  userName: string;
  userEmail: string;
}

export function DashboardLayout({
  aiEnabled,
  children,
  businessId,
  businessName,
  businessLocation,
  userName,
  userEmail,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userInitials = initials(userName);

  return (
    <div className="flex min-h-dvh bg-[#f7f8fb]">
      <LiveRefresh businessId={businessId} />
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        businessName={businessName}
        businessLocation={businessLocation}
        userName={userName}
        userEmail={userEmail}
        userInitials={userInitials}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-0">
        <TopBar aiEnabled={aiEnabled} onMenuClick={() => setSidebarOpen(true)} userInitials={userInitials} />

        <main className="min-w-0 flex-1">
          <div className="max-w-[1200px] mx-auto px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>

        <footer className="px-6 py-3 text-center text-[12px] text-[#b0b0be] border-t border-[#e9e9ef] bg-white">
          Made for your business. Built around you.{" "}
          <span className="ml-2">
            All times in Asia/Manila
          </span>
        </footer>
      </div>

      {aiEnabled && <MarketingManagerCopilot
        businessName={businessName}
        businessLocation={businessLocation}
      />}
    </div>
  );
}
