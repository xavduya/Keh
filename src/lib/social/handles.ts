import type { Platform } from '@/types';

const HOSTS: Record<Platform, string[]> = {
    FACEBOOK: ["facebook.com", "fb.com", "fb.me"],
    INSTAGRAM: ["instagram.com", "instgr.am"],
    TIKTOK: ["tiktok.com"],
};
const HANDLE: Record<Platform, RegExp> = {
    FACEBOOK: /^[^<>/\\]{2,100}$/,
    INSTAGRAM: /^[A-Za-z0-9._]{2,100}$/,
    TIKTOK: /^[A-Za-z0-9._]{2,24}$/,
}
const RESERVED = new Set (["p","reel","reels","explore","stories","accounts","share", "tv", "profile.php", "pages", "people", "login"]);
const EXAMPLE: Record<Platform, string> = {
    FACEBOOK: "Your Page name or link, e.g facebook.com/juancafe",
    INSTAGRAM: "Your username, e.g: @juancafe",
    TIKTOK: "Your username, e.g: @juancafe",
};

export type ParsedAccount = { ok: true; accountName: string } | { ok: false; error: string};

export function parseAccountInput(platform: Platform, raw: string): ParsedAccount {
    const fail = (): ParsedAccount => ({ ok: false, error: `Enter ${EXAMPLE[platform]}.`});
    let candidate = raw.trim();
    if (!candidate) return fail();

     if (/^https?:\/\//i.test(candidate) || /^(www\.|m\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(candidate)) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    } catch {
      return fail();
    }
    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
    if( !HOSTS[platform].includes(host)) return fail();
    candidate = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "");
}
    candidate = candidate.replace(/^@/, "").trim();
      if (!candidate || RESERVED.has(candidate.toLowerCase()) || !HANDLE[platform].test(candidate)) return fail();
      return { ok: true, accountName: platform === "FACEBOOK" ? candidate : `@${candidate}` };

}