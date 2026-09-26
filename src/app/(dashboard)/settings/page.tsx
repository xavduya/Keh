"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { HintBox } from "@/components/ui/hint-box";

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[#e9e9ef] last:border-0">
      <div>
        <p className="text-[14px] font-[600] text-[#262535]">{label}</p>
        <p className="text-[13px] text-[#7b7b8b] mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [priceFirst, setPriceFirst] = useState(false);
  const [fresh, setFresh] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Make yourself at home"
        subtitle="Your workspace preferences."
      />

      <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-6">
        <h2 className="font-heading font-[700] text-[17px] text-[#262535] mb-2">Preferences</h2>

        <SettingsRow
          label="Notification reminders"
          description="Reminders for posts that need a finishing touch."
        >
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            aria-label="Notification reminders"
            className="w-4 h-4 accent-[#5849da]"
          />
        </SettingsRow>

        <SettingsRow
          label="Timezone"
          description="All scheduled posts use Philippine time."
        >
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#f0edff] text-[#5849da] text-[12px] font-[700] whitespace-nowrap">
            Asia/Manila · UTC+8
          </span>
        </SettingsRow>

        <SettingsRow
          label="Explore as a new business"
          description="See the experience without posts or historical insights."
        >
          <input
            type="checkbox"
            checked={fresh}
            onChange={(e) => setFresh(e.target.checked)}
            aria-label="Explore as a new business"
            className="w-4 h-4 accent-[#5849da]"
          />
        </SettingsRow>

        <SettingsRow
          label="Always include prices"
          description="Make product prices visible in campaign drafts."
        >
          <input
            type="checkbox"
            checked={priceFirst}
            onChange={(e) => setPriceFirst(e.target.checked)}
            aria-label="Always include prices"
            className="w-4 h-4 accent-[#5849da]"
          />
        </SettingsRow>

        <HintBox className="mt-4">
          This is an interactive prototype. Edits last for this open session; refreshing restores
          the sample café. AI, analytics, billing, and social publishing are simulated.
        </HintBox>
      </section>
    </div>
  );
}
