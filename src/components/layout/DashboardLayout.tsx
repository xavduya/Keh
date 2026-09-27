"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { initials } from "@/utils";
import { MarketingManagerCopilot } from "@/components/assistant/MarketingManagerCopilot";
import { LiveRefresh } from "./LiveRefresh";

interface DashboardLayoutProps {
  children: React.ReactNode;
  businessId: string;
  businessName: string;
  businessLocation: string;
  userName: string;
  userEmail: string;
}

export function DashboardLayout({
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
    <div className="flex h-full min-h-screen bg-[#f7f8fb]">
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
        <TopBar onMenuClick={() => setSidebarOpen(true)} userInitials={userInitials} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-6 py-6">
            {children}
          </div>
        </main>

        <footer className="px-6 py-3 text-center text-[12px] text-[#b0b0be] border-t border-[#e9e9ef] bg-white">
          Made for your business. Built around you.{" "}
          <span className="ml-2">
            Prototype · Sample data · Asia/Manila
          </span>
        </footer>
      </div>

      <MarketingManagerCopilot
        businessName={businessName}
        businessLocation={businessLocation}
      />
    </div>
  );
}
