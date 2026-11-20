import { describe, expect, it } from "vitest";
import { parseAccountInput } from "./handles";

describe("parseAccountInput", () => {
  it("accepts handles and profile links", () => {
    expect(parseAccountInput("INSTAGRAM", "juanscafe")).toEqual({ ok: true, accountName: "@juanscafe" });
    expect(parseAccountInput("TIKTOK", "https://www.tiktok.com/@juanscafe?lang=en")).toEqual({ ok: true, accountName: "@juanscafe" });
    expect(parseAccountInput("FACEBOOK", "facebook.com/juanscafe")).toEqual({ ok: true, accountName: "juanscafe" });
    expect(parseAccountInput("FACEBOOK", "Juan's Café")).toEqual({ ok: true, accountName: "Juan's Café" });
  });
  it("rejects other sites, post links and junk", () => {
    expect(parseAccountInput("INSTAGRAM", "https://evil.com/juanscafe").ok).toBe(false);
    expect(parseAccountInput("INSTAGRAM", "https://instagram.com/p/ABC123").ok).toBe(false);
    expect(parseAccountInput("TIKTOK", "a b!").ok).toBe(false);
    expect(parseAccountInput("FACEBOOK", "   ").ok).toBe(false);
  });
});