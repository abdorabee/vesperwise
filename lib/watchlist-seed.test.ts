import { describe, expect, it } from "vitest";

import { liveWatchlistScore, watchlistScoreFields } from "@/lib/watchlist-seed";

describe("watchlistScoreFields", () => {
  it("copies score, band and timestamp from the latest score row", () => {
    const row = { score: 34, score_band: "COLD", created_at: "2026-09-29T14:00:00Z" };
    expect(watchlistScoreFields(row)).toEqual({ score: 34, score_band: "COLD", last_scored: "2026-09-29T14:00:00Z" });
  });

  it("returns nothing when the account was never scored", () => {
    expect(watchlistScoreFields(null)).toEqual({});
  });

  it("shows the latest scores row instead of the watchlist snapshot", () => {
    const displayed = liveWatchlistScore(
      {
        score: 34,
        score_band: "COLD" as const,
        last_scored: "2026-09-01T00:00:00Z",
        previous_score: 20,
      },
      [
        { score: 33, score_band: "COLD", created_at: "2026-10-20T00:00:00Z" },
        { score: 34, score_band: "COLD", created_at: "2026-09-01T00:00:00Z" },
      ],
    );
    expect(displayed.score).toBe(33);
    expect(displayed.score_band).toBe("COLD");
    expect(displayed.last_scored).toBe("2026-10-20T00:00:00Z");
    expect(displayed.previous_score).toBe(34);
  });

  it("ignores unscorable or malformed rows", () => {
    expect(watchlistScoreFields({ score: null, score_band: null, created_at: "2026-09-29T14:00:00Z" })).toEqual({});
    expect(watchlistScoreFields({ score: 80, score_band: "SCORCHING", created_at: "x" })).toEqual({});
    expect(watchlistScoreFields({ score: 80, score_band: "HOT" })).toEqual({});
  });
});
