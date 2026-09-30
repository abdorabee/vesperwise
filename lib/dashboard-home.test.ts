import { describe, expect, it } from "vitest";
import {
  computeKpis,
  creditUsage,
  dailyBandTrend,
  latestPerDomain,
  oneLineReason,
  parseRange,
  pickHotAccounts,
  recentActivity,
  relTime,
  signalChips,
  type ScoreIndexRow,
} from "./dashboard-home";
import type { ScoreBand } from "./types";

const NOW = Date.parse("2026-09-29T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
let seq = 0;

function row(domain: string, score: number, band: ScoreBand, daysAgo: number): ScoreIndexRow {
  seq += 1;
  return {
    id: `id-${seq}`,
    domain,
    company_name: domain.split(".")[0],
    score,
    score_band: band,
    created_at: new Date(NOW - daysAgo * DAY).toISOString(),
  };
}

describe("parseRange", () => {
  it("accepts known ranges and falls back to 30d", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("90D")).toBe("90d");
    expect(parseRange(["7d", "30d"])).toBe("7d");
    expect(parseRange("1y")).toBe("30d");
    expect(parseRange(undefined)).toBe("30d");
  });
});

describe("latestPerDomain", () => {
  it("keeps the newest row per domain regardless of input order", () => {
    const rows = [row("a.com", 40, "COLD", 5), row("a.com", 80, "HOT", 1), row("b.com", 60, "WARM", 2)];
    const latest = latestPerDomain(rows);
    expect(latest.get("a.com")?.score).toBe(80);
    expect(latest.size).toBe(2);
  });

  it("respects an as-of cutoff", () => {
    const rows = [row("a.com", 40, "COLD", 5), row("a.com", 80, "HOT", 1)];
    expect(latestPerDomain(rows, NOW - 3 * DAY).get("a.com")?.score).toBe(40);
  });
});

describe("computeKpis", () => {
  it("counts HOT from the latest score per domain, not every HOT row", () => {
    const rows = [row("a.com", 90, "HOT", 3), row("a.com", 40, "COLD", 1), row("b.com", 80, "HOT", 2)];
    const kpis = computeKpis(rows, NOW);
    expect(kpis.tracked).toBe(2);
    expect(kpis.hotNow).toBe(1);
    expect(kpis.avgHot).toBe(80);
    expect(kpis.bands).toEqual({ HOT: 1, WARM: 0, COLD: 1 });
  });

  it("omits prior-period comparisons when there is no data older than 7 days", () => {
    const kpis = computeKpis([row("a.com", 90, "HOT", 1)], NOW);
    expect(kpis.newHot7d).toBe(1);
    expect(kpis.prior).toBeNull();
  });

  it("computes new HOT and previous-week values when history exists", () => {
    const rows = [
      row("a.com", 60, "WARM", 20),
      row("a.com", 85, "HOT", 10), // turned HOT in the previous week
      row("b.com", 55, "WARM", 12),
      row("b.com", 78, "HOT", 2), // turned HOT this week
      row("c.com", 92, "HOT", 1), // new account, HOT this week
    ];
    const kpis = computeKpis(rows, NOW);
    expect(kpis.hotNow).toBe(3);
    expect(kpis.newHot7d).toBe(2);
    expect(kpis.avgHot).toBe(85);
    expect(kpis.prior).toEqual({ hotNow: 1, newHot7d: 1, avgHot: 85 });
  });
});

describe("dailyBandTrend", () => {
  it("snapshots accounts per band at the end of each UTC day", () => {
    const rows = [
      row("seed.com", 30, "COLD", 40), // before the range, seeds the starting state
      row("a.com", 60, "WARM", 2),
      row("a.com", 82, "HOT", 1),
      row("b.com", 20, "COLD", 0),
    ];
    const trend = dailyBandTrend(rows, 7, NOW);
    expect(trend.days).toHaveLength(7);
    expect(trend.days[0]).toMatchObject({ HOT: 0, WARM: 0, COLD: 1 });
    expect(trend.days[4]).toMatchObject({ HOT: 0, WARM: 1, COLD: 1 });
    expect(trend.days[5]).toMatchObject({ HOT: 1, WARM: 0, COLD: 1 });
    expect(trend.days[6]).toMatchObject({ date: "2026-09-29", HOT: 1, WARM: 0, COLD: 2 });
    expect(trend.activeDays).toBe(3);
  });

  it("reports zero active days when nothing was scored in range", () => {
    expect(dailyBandTrend([row("a.com", 80, "HOT", 60)], 30, NOW).activeDays).toBe(0);
  });
});

describe("pickHotAccounts", () => {
  it("ranks HOT by score, then non-HOT risers by delta", () => {
    const rows = [
      row("hot1.com", 80, "HOT", 1),
      row("hot2.com", 91, "HOT", 1),
      row("rise.com", 40, "COLD", 9),
      row("rise.com", 70, "WARM", 1),
      row("flat.com", 65, "WARM", 1),
    ];
    const picked = pickHotAccounts(rows);
    expect(picked.map((p) => p.domain)).toEqual(["hot2.com", "hot1.com", "rise.com"]);
    expect(picked[2].delta).toBe(30);
    expect(picked[0].delta).toBeNull();
  });

  it("caps the list", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`h${i}.com`, 75 + i, "HOT", 1));
    expect(pickHotAccounts(rows, 8)).toHaveLength(8);
  });
});

describe("recentActivity", () => {
  it("annotates band changes against the prior score of the same domain", () => {
    const rows = [row("a.com", 55, "WARM", 3), row("a.com", 80, "HOT", 0), row("b.com", 40, "COLD", 1)];
    const events = recentActivity(rows, 5);
    expect(events[0]).toMatchObject({ domain: "a.com", fromBand: "WARM", delta: 25 });
    expect(events[1]).toMatchObject({ domain: "b.com", fromBand: null, delta: null });
    expect(events).toHaveLength(3);
  });

  it("stops at the since cutoff", () => {
    const rows = [row("a.com", 80, "HOT", 0), row("b.com", 40, "COLD", 10)];
    expect(recentActivity(rows, 5, NOW - 7 * DAY)).toHaveLength(1);
  });
});

describe("relTime", () => {
  it('prints "now" under a minute', () => {
    expect(relTime(new Date(NOW - 20_000).toISOString(), NOW)).toBe("now");
    expect(relTime(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe("5m");
    expect(relTime(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe("3h");
    expect(relTime(new Date(NOW - 2 * DAY).toISOString(), NOW)).toBe("2d");
  });
});

describe("signalChips", () => {
  it("prefers stored contributions ordered by contribution", () => {
    const chips = signalChips(
      {
        contributions: [
          { type: "news", contribution: 5, daysAgo: 1 },
          { type: "funding", contribution: 18, daysAgo: 3 },
          { type: "hiring", contribution: 0, daysAgo: 2 },
        ] as never,
      },
      NOW,
    );
    expect(chips).toEqual(["Funding · 3d", "News · 1d"]);
  });

  it("falls back to legacy signals by score ratio", () => {
    const chips = signalChips(
      {
        signals: {
          funding: { score: 5, max: 25, detail: "", observed_at: new Date(NOW - 40 * DAY).toISOString() },
          hiring: { score: 18, max: 20, detail: "" },
          news: { score: 0, max: 20, detail: "" },
          latestSignalDate: "2026-09-01",
        },
      },
      NOW,
    );
    expect(chips).toEqual(["Hiring", "Funding · 1mo"]);
  });
});

describe("oneLineReason", () => {
  it("takes the first sentence of why_now, then the summary", () => {
    expect(oneLineReason({ why_now: "Raised a Series B. Hiring fast." })).toBe("Raised a Series B.");
    expect(oneLineReason({ why_now: " ", ai_summary: "Strong hiring signal" })).toBe("Strong hiring signal");
    expect(oneLineReason({})).toBeNull();
    expect(oneLineReason({ ai_summary: "x".repeat(200) }, 20)).toHaveLength(20);
  });
});

describe("creditUsage", () => {
  it("clamps to the plan allowance and flags low balances", () => {
    expect(creditUsage(1240, 2000)).toEqual({ remaining: 1240, cap: 2000, remainingPct: 62, low: false });
    expect(creditUsage(2500, 2000).remainingPct).toBe(100);
    expect(creditUsage(100, 2000).low).toBe(true);
    expect(creditUsage(-3, 0)).toEqual({ remaining: 0, cap: 0, remainingPct: 0, low: true });
  });
});
