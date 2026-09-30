import { describe, expect, it } from "vitest";

import { watchlistScoreFields } from "@/lib/watchlist-seed";

describe("watchlistScoreFields", () => {
  it("copies score, band and timestamp from the latest score row", () => {
    const row = { score: 34, score_band: "COLD", created_at: "2026-09-29T14:00:00Z" };
    expect(watchlistScoreFields(row)).toEqual({ score: 34, score_band: "COLD", last_scored: "2026-09-29T14:00:00Z" });
  });

  it("returns nothing when the account was never scored", () => {
    expect(watchlistScoreFields(null)).toEqual({});
  });

  it("ignores unscorable or malformed rows", () => {
    expect(watchlistScoreFields({ score: null, score_band: null, created_at: "2026-09-29T14:00:00Z" })).toEqual({});
    expect(watchlistScoreFields({ score: 80, score_band: "SCORCHING", created_at: "x" })).toEqual({});
    expect(watchlistScoreFields({ score: 80, score_band: "HOT" })).toEqual({});
  });
});
