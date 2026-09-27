"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PostStatusBadge } from "@/components/ui/post-status-badge";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { HintBox } from "@/components/ui/hint-box";
import type { SocialAccount } from "@/types";

const GOOGLE_PLACEHOLDER: SocialAccount = {
  id: "acct_google",
  businessId: "",
  platform: "FACEBOOK", // placeholder — Google not in Platform type yet
  accountName: "Business profile",
  connected: false,
  requiresManualPublish: false,
};

const ACCOUNT_LABELS = ["Facebook", "Instagram", "TikTok", "Google Business"];

function AccountCard({
  account,
  label,
  onConnect,
  onDisconnect,
}: {
  account: SocialAccount;
  label: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <section className="bg-white rounded-[12px] border border-[#e9e9ef] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {account.platform !== "FACEBOOK" || label === "Facebook" ? (
            <SocialPlatformBadge
              platform={label === "Google Business" ? "FACEBOOK" : account.platform}
              size="md"
            />
          ) : (
            <span className="w-7 h-7 rounded-full bg-[#4285f4] text-white text-[13px] flex items-center justify-center font-bold">G</span>
          )}
          <h2 className="font-heading font-[700] text-[16px] text-[#262535]">{label}</h2>
        </div>
        <PostStatusBadge status={account.connected ? "PUBLISHED" : "DRAFT"} />
      </div>
      <p className="text-[14px] text-[#262535]">{account.accountName}</p>
      <p className="text-[13px] text-[#7b7b8b]">
        {account.connected ? "Last sample sync: just now" : "Ready when you are"}
      </p>
      <HintBox>
        {account.connected
          ? account.requiresManualPublish
            ? "Manual action required: add audio and publish in TikTok."
            : "Automatic publishing supported in this demo flow."
          : label === "Google Business"
          ? "Connect your business profile to keep your local presence organized."
          : `Connect your ${label} account to start publishing.`}
      </HintBox>
      <div className="flex gap-2">
        {account.connected ? (
          <>
            <button
              onClick={onConnect}
              className="px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] hover:bg-[#f7f8fb] transition-colors"
            >
              Reconnect
            </button>
            <button
              onClick={onDisconnect}
              className="px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] text-[#b54b4b] hover:bg-[#fdecec] transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="px-3 py-2 rounded-[7px] bg-[#5849da] text-white text-[13px] font-[600] hover:bg-[#4a3cc7] transition-colors"
          >
            Connect account
          </button>
        )}
      </div>
    </section>
  );
}

export function SocialAccountsManager({
  accounts: initialAccounts,
}: {
  accounts: SocialAccount[];
}) {
  const [accounts, setAccounts] = useState([
    ...initialAccounts,
    { ...GOOGLE_PLACEHOLDER },
  ]);

  function handleConnect(i: number) {
    setAccounts((prev) =>
      prev.map((a, idx) => idx === i ? { ...a, connected: true } : a)
    );
  }

  function handleDisconnect(i: number) {
    setAccounts((prev) =>
      prev.map((a, idx) => idx === i ? { ...a, connected: false } : a)
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your social accounts"
        subtitle="One place to keep your business connected."
      />

      <HintBox>
        Demo connections only. No real social accounts are connected and no posts are sent.
      </HintBox>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account, i) => (
          <AccountCard
            key={account.id}
            account={account}
            label={ACCOUNT_LABELS[i]}
            onConnect={() => handleConnect(i)}
            onDisconnect={() => handleDisconnect(i)}
          />
        ))}
      </div>
    </div>
  );
}
