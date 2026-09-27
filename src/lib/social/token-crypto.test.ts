import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from "./token-crypto";

describe("token encryption", () => {
  beforeEach(() => {
    process.env.SOCIAL_TOKEN_KEY = randomBytes(32).toString("base64");
  });
  afterEach(() => {
    delete process.env.SOCIAL_TOKEN_KEY;
  });

  it("round-trips and never stores the plain token", () => {
    const stored = encryptToken("EAAG-page-token");
    expect(stored.startsWith("enc:v1:")).toBe(true);
    expect(stored).not.toContain("EAAG");
    expect(decryptToken(stored)).toBe("EAAG-page-token");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("reads tokens saved before encryption as-is", () => {
    expect(decryptToken("legacy-plain-token")).toBe("legacy-plain-token");
  });

  it("rejects tampered values and the wrong key", () => {
    const stored = encryptToken("secret");
    const tampered = stored.slice(0, -2) + (stored.endsWith("A") ? "BB" : "AA");
    expect(() => decryptToken(tampered)).toThrow();

    process.env.SOCIAL_TOKEN_KEY = randomBytes(32).toString("base64");
    expect(() => decryptToken(stored)).toThrow();
  });

  it("requires a 32-byte key", () => {
    process.env.SOCIAL_TOKEN_KEY = randomBytes(16).toString("base64");
    expect(isTokenEncryptionConfigured()).toBe(false);
    expect(() => encryptToken("x")).toThrow(/SOCIAL_TOKEN_KEY/);
  });
});
