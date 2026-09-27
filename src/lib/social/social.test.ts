import { describe, expect, it } from "vitest";
import { connectErrorMessage } from "./connect-errors";
import { createOAuthState, verifyOAuthState } from "./oauth-state";

describe("OAuth state", () => {
  it("accepts a state whose nonce matches the cookie", () => {
    const { state, nonce } = createOAuthState("INSTAGRAM");
    expect(verifyOAuthState(state, nonce)).toEqual({ nonce, platform: "INSTAGRAM" });
  });

  it("rejects a missing or different cookie, and tampered state", () => {
    const { state } = createOAuthState("FACEBOOK");
    const other = createOAuthState("FACEBOOK");
    expect(verifyOAuthState(state, undefined)).toBeNull();
    expect(verifyOAuthState(state, other.nonce)).toBeNull();
    expect(verifyOAuthState("not-base64-json", other.nonce)).toBeNull();
  });
});

describe("connect error messages", () => {
  it("maps known codes and ignores anything else", () => {
    expect(connectErrorMessage("cancelled")).toMatch(/cancelled/);
    expect(connectErrorMessage("<b>Call this number</b>")).toBeUndefined();
    expect(connectErrorMessage("toString")).toBeUndefined();
    expect(connectErrorMessage(undefined)).toBeUndefined();
  });
});
