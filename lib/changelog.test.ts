import { describe, expect, it } from "vitest";
import { CHANGELOG, formatChangelogDate, groupChangelogByMonth } from "./changelog";

describe("CHANGELOG", () => {
  it("uses valid ISO dates, newest first", () => {
    for (const entry of CHANGELOG) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
    }
    const dates = CHANGELOG.map((e) => e.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("gives every entry a title, summary and at least one item", () => {
    for (const entry of CHANGELOG) {
      expect(entry.title.trim()).not.toBe("");
      expect(entry.summary.trim()).not.toBe("");
      expect(entry.items.length).toBeGreaterThan(0);
    }
  });
});

describe("groupChangelogByMonth", () => {
  it("groups consecutive entries by UTC month", () => {
    const groups = groupChangelogByMonth([
      { date: "2026-09-26", title: "a", tag: "New", summary: "s", items: ["i"] },
      { date: "2026-09-01", title: "b", tag: "New", summary: "s", items: ["i"] },
      { date: "2026-08-31", title: "c", tag: "Fixed", summary: "s", items: ["i"] },
    ]);
    expect(groups.map((g) => [g.month, g.entries.length])).toEqual([
      ["September 2026", 2],
      ["August 2026", 1],
    ]);
  });
});

describe("formatChangelogDate", () => {
  it("formats without shifting the day across time zones", () => {
    expect(formatChangelogDate("2026-09-01")).toBe("Sep 1");
  });
});
