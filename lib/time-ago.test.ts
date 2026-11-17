import { describe, expect, it } from "vitest";
import { daysSince, formatAbsoluteDate, formatDaysAgo, formatRelativeTime, timeAgo } from "./time-ago";

const NOW = new Date("2026-09-29T12:00:00.000Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("formatRelativeTime", () => {
  it.each([
    [0, "just now"],
    [59_000, "just now"],
    [MIN, "1m ago"],
    [5 * MIN, "5m ago"],
    [59 * MIN, "59m ago"],
    [HOUR, "1h ago"],
    [23 * HOUR + 59 * MIN, "23h ago"],
    [DAY, "1d ago"],
    [6 * DAY, "6d ago"],
    [7 * DAY, "1w ago"],
    [29 * DAY, "4w ago"],
    [30 * DAY, "1mo ago"],
    [170 * DAY, "5mo ago"],
    [364 * DAY, "12mo ago"],
    [365 * DAY, "1y ago"],
    [800 * DAY, "2y ago"],
  ])("formats %d ms as %s", (offset, expected) => {
    expect(formatRelativeTime(ago(offset), NOW)).toBe(expected);
  });

  it("accepts ISO strings, epoch numbers and Date objects", () => {
    expect(formatRelativeTime("2026-09-29T09:00:00.000Z", NOW)).toBe("3h ago");
    expect(formatRelativeTime(NOW.getTime() - 2 * DAY, NOW.getTime())).toBe("2d ago");
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe("2d ago");
  });

  it("clamps future timestamps to just now", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + HOUR), NOW)).toBe("just now");
  });

  it("returns a dash for invalid input", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe("—");
    expect(formatRelativeTime(null, NOW)).toBe("—");
    expect(formatRelativeTime(undefined, NOW)).toBe("—");
    expect(formatRelativeTime("", NOW)).toBe("—");
    expect(formatRelativeTime(Number.NaN, NOW)).toBe("—");
  });
});

describe("time helpers", () => {
  it("formats evidence age in days with the shared style", () => {
    expect(formatDaysAgo(0)).toBe("today");
    expect(formatDaysAgo(3)).toBe("3d ago");
    expect(formatDaysAgo(42.7)).toBe("1mo ago");
    expect(formatDaysAgo(170)).toBe("5mo ago");
    expect(formatDaysAgo(800)).toBe("2y ago");
    expect(formatDaysAgo(null)).toBeNull();
  });

  it("formats timeAgo as today or the shared style", () => {
    expect(timeAgo("2026-09-29T08:00:00.000Z", NOW)).toBe("today");
    expect(timeAgo("2026-09-27T12:00:00.000Z", NOW)).toBe("2d ago");
    expect(timeAgo(null, NOW)).toBe("—");
    expect(timeAgo("nope", NOW)).toBe("—");
  });

  it("computes whole days and absolute dates", () => {
    expect(daysSince("2026-08-18T12:00:00.000Z", NOW.getTime())).toBe(42);
    expect(formatAbsoluteDate("2026-09-27T00:00:00.000Z")).toMatch(/^27 Sept? 2026$/);
  });
});
