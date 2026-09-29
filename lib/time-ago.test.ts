import { describe, expect, it } from "vitest";
import { daysSince, formatAbsoluteDate, formatDaysAgo, formatRelativeTime } from "./time-ago";

const NOW = Date.parse("2026-09-29T12:00:00.000Z");

describe("time helpers", () => {
  it("formats evidence age in days", () => {
    expect(formatDaysAgo(0)).toBe("today");
    expect(formatDaysAgo(42.7)).toBe("42 d ago");
    expect(formatDaysAgo(800)).toBe("2 y ago");
    expect(formatDaysAgo(null)).toBeNull();
  });

  it("formats relative recency", () => {
    expect(formatRelativeTime("2026-09-29T11:59:30.000Z", NOW)).toBe("just now");
    expect(formatRelativeTime("2026-09-29T11:48:00.000Z", NOW)).toBe("12 min ago");
    expect(formatRelativeTime("2026-09-29T09:00:00.000Z", NOW)).toBe("3 h ago");
    expect(formatRelativeTime("2026-09-27T12:00:00.000Z", NOW)).toBe("2 d ago");
    expect(formatRelativeTime("not a date", NOW)).toBeNull();
  });

  it("computes whole days and absolute dates", () => {
    expect(daysSince("2026-08-18T12:00:00.000Z", NOW)).toBe(42);
    expect(formatAbsoluteDate("2026-09-27T00:00:00.000Z")).toMatch(/^27 Sept? 2026$/);
  });
});
