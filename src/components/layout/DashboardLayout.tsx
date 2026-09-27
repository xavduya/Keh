"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  businessName: string;
  businessLocation: string;
}

export function DashboardLayout({ children, businessName, businessLocation }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen bg-[#f7f8fb]">
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        businessName={businessName}
        businessLocation={businessLocation}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

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
    </div>
  );
}
