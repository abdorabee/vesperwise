import { describe, expect, it } from "vitest";
import { computeChanges, type ScorePoint } from "@/lib/mcp/tools";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-15T12:00:00Z");
const SINCE = NOW - 7 * DAY;
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const watched = [
  { domain: "rising.com", company_name: "Rising" },
  { domain: "flat.com", company_name: "Flat" },
  { domain: "stale.com", company_name: "Stale" },
  { domain: "new.com", company_name: "New" },
  { domain: "hot.com", company_name: "Hot" },
  { domain: "never.com", company_name: "Never" },
];

const points: ScorePoint[] = [
  { domain: "rising.com", score: 40, score_band: "COLD", created_at: at(20) },
  { domain: "rising.com", score: 62, score_band: "WARM", created_at: at(2) },
  { domain: "flat.com", score: 55, score_band: "WARM", created_at: at(10) },
  { domain: "flat.com", score: 55, score_band: "WARM", created_at: at(1) },
  { domain: "stale.com", score: 80, score_band: "HOT", created_at: at(30) },
  { domain: "new.com", score: 51, score_band: "WARM", created_at: at(3) },
  { domain: "hot.com", score: 72, score_band: "WARM", created_at: at(9) },
  { domain: "hot.com", score: 76, score_band: "HOT", created_at: at(1) },
];

describe("computeChanges", () => {
  it("reports moves, HOT crossings and new scores, newest HOT first", () => {
    const { changed, unchanged, stale } = computeChanges(watched, points, SINCE);

    expect(changed.map((c) => c.domain)).toEqual(["hot.com", "rising.com", "new.com"]);
    expect(changed[0]).toMatchObject({ became_hot: true, previous_score: 72, score: 76, delta: 4 });
    expect(changed[1]).toMatchObject({ delta: 22, previous_band: "COLD", score_band: "WARM" });
    expect(changed[2]).toMatchObject({ previous_score: null, delta: null });
    expect(unchanged).toBe(1);
    expect(stale.map((s) => s.domain)).toEqual(["stale.com", "never.com"]);
    expect(stale[1].last_scored).toBeNull();
  });

  it("drops small moves below min_delta but keeps HOT crossings", () => {
    const { changed, unchanged } = computeChanges(watched, points, SINCE, 10);

    expect(changed.map((c) => c.domain)).toEqual(["hot.com", "rising.com", "new.com"]);
    expect(unchanged).toBe(1);

    const quiet = computeChanges(watched, points, SINCE, 30);
    expect(quiet.changed.map((c) => c.domain)).toEqual(["hot.com", "new.com"]);
  });
});
