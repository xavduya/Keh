import { describe, expect, it } from "vitest";
import type { Platform, PostPerformance, Product } from "@/types";
import { findings, insights, periodSummary, recommendedSlot } from "./analytics";

const product = (id: string, name: string): Product => ({
  id,
  businessId: "b1",
  name,
  description: "",
  price: 100,
  category: "Drinks",
  imageUrl: "",
  availability: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
});

const latte = product("p1", "Latte");
const bread = product("p2", "Pandesal");

function post(id: string, p: Product, platform: Platform, publishedAt: string, reach: number): PostPerformance {
  return {
    id,
    campaignId: `c-${id}`,
    productId: p.id,
    platform,
    title: p.name,
    caption: "",
    scheduledAt: publishedAt,
    publishedAt,
    status: "PUBLISHED",
    product: p,
    platforms: [platform],
    reach,
    interactions: 0,
    clicks: 0,
  };
}

// Fridays 6 PM Manila (10:00 UTC) do best; the latte beats the bread.
const posts = [
  post("1", latte, "INSTAGRAM", "2026-09-04T10:00:00Z", 900),
  post("2", latte, "INSTAGRAM", "2026-09-11T10:00:00Z", 1100),
  post("3", bread, "FACEBOOK", "2026-09-08T02:00:00Z", 200),
  post("4", bread, "FACEBOOK", "2026-09-15T02:00:00Z", 300),
];

describe("analytics", () => {
  it("has nothing to say without measured posts", () => {
    const f = findings([]);
    expect(f.measuredCount).toBe(0);
    expect(insights(f, periodSummary([], "2026-09-27"))).toEqual([]);
    expect(recommendedSlot(f)).toMatchObject({ weekday: 5, time: "18:00", fromResults: false });
  });

  it("finds the best product, platform and posting window", () => {
    const f = findings(posts);
    expect(f.measuredCount).toBe(4);
    expect(f.bestProduct?.value.name).toBe("Latte");
    expect(f.bestPlatform?.value).toBe("INSTAGRAM");
    expect(f.bestWindow?.value).toMatch(/^Friday/);
    expect(recommendedSlot(f)).toMatchObject({ weekday: 5, fromResults: true });
  });

  it("ignores posts that aren't published", () => {
    const draft = { ...post("5", bread, "TIKTOK", "2026-09-20T10:00:00Z", 5000), status: "DRAFT" as const };
    expect(findings([...posts, draft]).bestPlatform?.value).toBe("INSTAGRAM");
  });
});
