import { describe, expect, it } from "vitest";
import { addDays, manilaClock, manilaDateKey, manilaTime, manilaToUtcIso, nextWeekday } from "./datetime";

describe("datetime (Asia/Manila)", () => {
  it("converts Manila wall-clock time to UTC", () => {
    expect(manilaToUtcIso("2026-10-02", "18:00")).toBe("2026-10-02T10:00:00.000Z");
    // Early morning in Manila is still the previous day in UTC.
    expect(manilaToUtcIso("2026-10-02", "07:30")).toBe("2026-10-01T23:30:00.000Z");
  });

  it("reads the Manila calendar date and time of a UTC instant", () => {
    expect(manilaDateKey("2026-10-01T20:00:00Z")).toBe("2026-10-02");
    expect(manilaTime("2026-10-02T10:00:00Z")).toBe("6:00 PM");
    expect(manilaClock("2026-10-02T10:00:00Z")).toBe("18:00");
    expect(manilaClock("2026-10-01T16:05:00Z")).toBe("00:05");
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("finds the next weekday strictly after the date", () => {
    // 2026-10-02 is a Friday.
    expect(nextWeekday("2026-10-02", 5)).toBe("2026-10-09");
    expect(nextWeekday("2026-10-02", 6)).toBe("2026-10-03");
    expect(nextWeekday("2026-10-02", 1)).toBe("2026-10-05");
  });
});
