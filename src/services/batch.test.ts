import { describe, expect, it } from "vitest";
import { chunk } from "./batch";

describe("chunk", () => {
  it("splits into batches of the given size, keeping order", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });

  it("keeps 150 UUIDs per batch under ~6 KB of URL", () => {
    const ids = Array.from({ length: 400 }, () => crypto.randomUUID());
    const batches = chunk(ids);
    expect(batches).toHaveLength(3);
    expect(batches.every((b) => b.join(",").length < 6000)).toBe(true);
  });
});
