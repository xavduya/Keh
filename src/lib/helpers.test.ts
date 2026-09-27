import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_PLANS } from "@/constants";
import { isPlan } from "@/services/billing.service";
import { safeNextPath } from "./request-origin";

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("/settings?tab=1")).toBe("/settings?tab=1");
  });

  it("falls back for anything that could leave the site", () => {
    for (const next of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      expect(safeNextPath(next)).toBe("/dashboard");
    }
  });
});

describe("plans", () => {
  it("recognises only real plan IDs", () => {
    expect(isPlan("STARTER")).toBe(true);
    expect(isPlan("ENTERPRISE")).toBe(false);
    expect(isPlan(undefined)).toBe(false);
  });

  it("orders plans from free to most generous", () => {
    const prices = SUBSCRIPTION_PLANS.map((p) => p.pricePerMonth);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(SUBSCRIPTION_PLANS[0]).toMatchObject({ id: "FREE", pricePerMonth: 0 });
  });
});
