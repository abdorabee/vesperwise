import { describe, expect, it } from "vitest";
import { dedupeByDomain, displayThreadTitle, domainOfTitle, dedupeSessionsByDomain, isStaleScore, STALE_SCORE_DAYS } from "./recent-scores";

const NOW = Date.parse("2026-11-17T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe("isStaleScore", () => {
  it("uses a 30 day threshold", () => {
    expect(STALE_SCORE_DAYS).toBe(30);
    expect(isStaleScore(daysAgo(29), NOW)).toBe(false);
    expect(isStaleScore(daysAgo(31), NOW)).toBe(true);
  });
  it("is false for missing or invalid dates", () => {
    expect(isStaleScore(null, NOW)).toBe(false);
    expect(isStaleScore("nope", NOW)).toBe(false);
  });
});

describe("dedupeByDomain", () => {
  it("keeps the newest row per domain, case-insensitively, and respects the limit", () => {
    const rows = [
      { domain: "stripe.com", created_at: daysAgo(5) },
      { domain: "Stripe.com", created_at: daysAgo(1) },
      { domain: "ramp.com", created_at: daysAgo(3) },
      { domain: "linear.app", created_at: daysAgo(9) },
    ];
    const result = dedupeByDomain(rows, 2);
    expect(result.map((row) => row.domain)).toEqual(["Stripe.com", "ramp.com"]);
  });
  it("does not mutate its input", () => {
    const rows = [{ domain: "a.com", created_at: daysAgo(2) }, { domain: "b.com", created_at: daysAgo(1) }];
    dedupeByDomain(rows);
    expect(rows[0].domain).toBe("a.com");
  });
});

describe("dedupeSessionsByDomain", () => {
  const session = (id: string, title: string, updated_at: string) => ({ id, title, created_at: updated_at, updated_at });
  it("collapses threads for the same domain to the newest and keeps non-domain titles", () => {
    const result = dedupeSessionsByDomain([
      session("old", "stripe.com", daysAgo(10)),
      session("new", "https://www.stripe.com", daysAgo(1)),
      session("a", "Ramp notes", daysAgo(4)),
      session("b", "Ramp notes", daysAgo(5)),
    ]);
    expect(result.map((item) => item.id).sort()).toEqual(["a", "b", "new"]);
  });
});

describe("legacy thread titles", () => {
  const legacy = "[Score result — Fastautomate (fastautomate.com)]";
  it("resolves the wrapped title to its domain for labels and rescore", () => {
    expect(domainOfTitle(legacy)).toBe("fastautomate.com");
    expect(displayThreadTitle(legacy)).toBe("fastautomate.com");
    expect(displayThreadTitle("Ramp notes")).toBe("Ramp notes");
  });
  it("dedupes wrapped and plain titles of the same domain", () => {
    const session = (id: string, title: string, updated_at: string) => ({ id, title, created_at: updated_at, updated_at });
    const result = dedupeSessionsByDomain([session("old", legacy, daysAgo(9)), session("new", "fastautomate.com", daysAgo(1))]);
    expect(result.map((item) => item.id)).toEqual(["new"]);
  });
});
