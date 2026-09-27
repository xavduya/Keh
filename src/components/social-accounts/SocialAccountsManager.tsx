"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SocialPlatformBadge } from "@/components/ui/social-platform-badge";
import { HintBox } from "@/components/ui/hint-box";
import { connectTikTok, disconnect } from "@/app/(dashboard)/social-accounts/actions";
import { formatManilaDate } from "@/utils/datetime";
import type { Platform, SocialAccount } from "@/types";

const LABELS: Record<Platform, string> = { FACEBOOK: "Facebook", INSTAGRAM: "Instagram", TIKTOK: "TikTok" };

const HINTS: Record<Platform, { connected: string; disconnected: string }> = {
  FACEBOOK: {
    connected: "Keh can publish to this Page automatically.",
    disconnected: "Connect a Facebook Page you manage so Keh can publish to it.",
  },
  INSTAGRAM: {
    connected: "Keh can publish to this account automatically.",
    disconnected: "Needs an Instagram Business or Creator account linked to a Facebook Page.",
  },
  TIKTOK: {
    connected: "Keh prepares each TikTok post; you add audio and publish it in the app.",
    disconnected: "TikTok doesn't let apps post for you. Add your username and Keh will prepare posts for you to publish.",
  },
};

function StatusPill({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-[12px] font-semibold pill-published">
      <CheckCircle2 size={12} /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center rounded-[5px] px-2 py-[3px] text-[12px] font-semibold pill-draft">
      Not connected
    </span>
  );
}

function AccountCard({ account, metaConfigured }: { account: SocialAccount; metaConfigured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const label = LABELS[account.platform];
  const isTikTok = account.platform === "TIKTOK";

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDisconnect() {
    if (!window.confirm(`Disconnect ${label}? Your prepared content stays in the library, but Keh won't publish to ${label} until you reconnect.`)) return;
    run(() => disconnect(account.platform));
  }

  return (
    <section className={`bg-white rounded-[12px] border border-[#e9e9ef] p-5 flex flex-col gap-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SocialPlatformBadge platform={account.platform} size="md" />
          <h2 className="font-heading font-[700] text-[16px] text-[#262535]">{label}</h2>
        </div>
        <StatusPill connected={account.connected} />
      </div>

      {account.connected && (
        <div>
          <p className="text-[14px] font-[600] text-[#262535]">{account.accountName}</p>
          {account.lastSyncedAt && (
            <p className="text-[12px] text-[#7b7b8b]">
              Connected {formatManilaDate(account.lastSyncedAt, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      <HintBox>{account.connected ? HINTS[account.platform].connected : HINTS[account.platform].disconnected}</HintBox>

      {isTikTok && !account.connected && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => connectTikTok(handle));
          }}
          className="flex gap-2"
        >
          <label className="sr-only" htmlFor="tiktok-handle">TikTok username</label>
          <input
            id="tiktok-handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@yourbusiness"
            className="flex-1 min-w-0 px-3 py-2 border border-[#e9e9ef] rounded-[7px] text-[13px] focus:outline-none focus:border-[#5849da]"
          />
          <button
            type="submit"
            disabled={pending || !handle.trim()}
            className="px-3 py-2 rounded-[7px] bg-[#5849da] text-white text-[13px] font-[600] hover:bg-[#4a3cc7] disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {!isTikTok && (
          metaConfigured ? (
            // A full navigation: the route redirects to Facebook's login.
            <a
              href={`/api/social/connect/${account.platform.toLowerCase()}`}
              className={
                account.connected
                  ? "px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] hover:bg-[#f7f8fb]"
                  : "px-3 py-2 rounded-[7px] bg-[#5849da] text-white text-[13px] font-[600] hover:bg-[#4a3cc7]"
              }
            >
              {account.connected ? "Reconnect" : `Connect ${label}`}
            </a>
          ) : (
            <span className="text-[12px] text-[#7b7b8b]">
              Connecting {label} needs the Meta app to be set up (META_APP_ID / META_APP_SECRET).
            </span>
          )
        )}
        {account.connected && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={pending}
            className="px-3 py-2 rounded-[7px] border border-[#e9e9ef] text-[13px] font-[500] text-[#b54b4b] hover:bg-[#fdecec] disabled:opacity-50"
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" /> : "Disconnect"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

export function SocialAccountsManager({
  accounts,
  metaConfigured,
  error,
  justConnected,
}: {
  accounts: SocialAccount[];
  metaConfigured: boolean;
  /** Message from the OAuth callback, if connecting failed. */
  error?: string;
  justConnected?: boolean;
}) {
  return (
    <div className="space-y-5">
      <PageHeader title="Your social accounts" subtitle="One place to keep your business connected." />

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </p>
      )}
      {justConnected && !error && (
        <p role="status" className="rounded-lg bg-[#edf7f2] px-4 py-3 text-[13px] text-[#1a7a55]">
          ✓ Account connected.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <AccountCard key={account.platform} account={account} metaConfigured={metaConfigured} />
        ))}
      </div>

      <HintBox>
        Keh only asks for the permissions it needs to publish and read your post results. You can disconnect any time;
        disconnecting deletes the stored access.
      </HintBox>
    </div>
  );
}
