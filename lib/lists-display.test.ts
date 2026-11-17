import { describe, expect, it } from "vitest";

import type { AccountContext, DbList, ListCardSummary } from "@/lib/lists-types";
import {
  buildHeroStats,
  buildListCardSummary,
  buildListDetail,
  buildListTrend,
  buildMemberTrend,
  computeWeekDeltas,
  deltaLabel,
  pluralize,
} from "./lists-display";

const NOW = new Date("2026-11-14T12:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

function account(domain: string, score: number | null, events: Array<[number, number]> = []): AccountContext {
  const band = score == null ? null : score >= 75 ? "HOT" : score >= 50 ? "WARM" : "COLD";
  return {
    domain,
    company_name: domain,
    score,
    score_band: band,
    signals: null,
    inWatchlist: false,
    ai_summary: null,
    key_triggers: null,
    why_now: null,
    scoreHistory: events.map(([, s]) => s),
    scoreEvents: events.map(([d, s]) => ({ at: iso(d), score: s })),
  };
}

function list(over: Partial<DbList> = {}): DbList {
  return {
    id: "l1",
    user_id: "u1",
    name: "Targets",
    description: null,
    list_type: "manual",
    color: "#fff",
    icon_initials: null,
    rules: null,
    auto_refresh: false,
    created_at: iso(30),
    updated_at: iso(2),
    ...over,
  };
}

function summary(name: string, members: AccountContext[]): ListCardSummary {
  return buildListCardSummary(list({ id: name, name }), members, null);
}

describe("buildHeroStats", () => {
  it("counts only list members when the pool has many other accounts", () => {
    const member = account("a.com", 20);
    const pool = [member, account("b.com", 90), account("c.com", 80), account("d.com", 60)];
    const map = new Map([["a.com", ["Targets"]]]);

    const hero = buildHeroStats([summary("Targets", [member])], map, pool);

    expect(hero.totalAccounts).toBe(1);
    expect(hero.bandMix).toEqual({ hot: 0, warm: 0, cold: 1 });
    expect(hero.hotCount).toBe(0);
    expect(hero.firingAccounts).toEqual([]);
  });

  it("counts an account once when lists overlap", () => {
    const shared = account("a.com", 90);
    const map = new Map([["a.com", ["One", "Two"]]]);

    const hero = buildHeroStats([summary("One", [shared]), summary("Two", [shared])], map, [shared]);

    expect(hero.totalAccounts).toBe(1);
    expect(hero.overlapCount).toBe(1);
    expect(hero.bandMix.hot).toBe(1);
    expect(hero.hotCount).toBe(1);
  });

  it("names no hottest list when nothing is HOT", () => {
    const m = account("a.com", 55);
    const hero = buildHeroStats([summary("Warm", [m])], new Map([["a.com", ["Warm"]]]), [m]);

    expect(hero.hottestList).toBeNull();
  });

  it("does not cap the HOT count, only the preview", () => {
    const hot = ["a", "b", "c", "d", "e"].map((d) => account(`${d}.com`, 90));
    const map = new Map(hot.map((h) => [h.domain, ["Hot"]]));

    const hero = buildHeroStats([summary("Hot", hot)], map, hot);

    expect(hero.hotCount).toBe(5);
    expect(hero.firingAccounts).toHaveLength(3);
    expect(hero.hottestList).toMatchObject({ name: "Hot", hotNow: 5, total: 5 });
  });

  it("reports unscored members separately from the band mix", () => {
    const m = account("a.com", null);
    const hero = buildHeroStats([summary("L", [m])], new Map([["a.com", ["L"]]]), [m]);

    expect(hero.unscoredCount).toBe(1);
    expect(hero.bandMix).toEqual({ hot: 0, warm: 0, cold: 0 });
  });
});

describe("deltas", () => {
  it("shows no delta without prior data", () => {
    const fresh = account("a.com", 90, [[1, 90]]);

    expect(computeWeekDeltas([fresh], NOW)).toEqual({ hot: null, warm: null, avg: null });
    expect(buildListCardSummary(list(), [fresh], null).addedThisWeek).toBeNull();
    expect(buildListCardSummary(list(), [fresh], 0).addedThisWeek).toBeNull();
  });

  it("derives deltas from accounts scored a week ago", () => {
    const rose = account("a.com", 80, [[10, 40], [1, 80]]);

    const deltas = computeWeekDeltas([rose], NOW);

    expect(deltas).toEqual({ hot: 1, warm: 0, avg: 40 });
  });

  it("surfaces real added-this-week counts only", () => {
    expect(buildListCardSummary(list(), [], 3).addedThisWeek).toBe(3);
    const detail = buildListDetail(list(), [account("a.com", 10)], null, new Map(), NOW);
    expect(detail.stats.addedThisWeek).toBeNull();
    expect(detail.stats.hotDelta).toBeNull();
  });

  it("renders no label for missing or zero deltas", () => {
    expect(deltaLabel(null)).toBeNull();
    expect(deltaLabel(0)).toBeNull();
    expect(deltaLabel(2)).toBe("▲ 2 this week");
    expect(deltaLabel(-1)).toBe("▼ 1 this week");
  });
});

describe("sparklines", () => {
  it("is hidden under two points", () => {
    expect(buildListTrend([account("a.com", 50, [[1, 50]])])).toEqual([]);
    expect(buildMemberTrend([{ at: iso(1), score: 5 }])).toEqual([]);
  });

  it("averages the list per day in date order", () => {
    const a = account("a.com", 60, [[3, 40], [1, 60]]);
    const b = account("b.com", 80, [[2, 80]]);

    expect(buildListTrend([a, b])).toEqual([40, 60, 70]);
  });

  it("keeps a member trend in event order without padding", () => {
    const events = [{ at: iso(3), score: 10 }, { at: iso(2), score: 20 }, { at: iso(1), score: 30 }];

    expect(buildMemberTrend(events)).toEqual([10, 20, 30]);
  });
});

describe("wording", () => {
  it("pluralizes counts", () => {
    expect(pluralize(1, "list")).toBe("1 list");
    expect(pluralize(0, "account")).toBe("0 accounts");
    expect(pluralize(2, "company", "companies")).toBe("2 companies");
  });

  it("labels the update time as an edit", () => {
    expect(buildListCardSummary(list(), [], null).lastUpdatedLabel).toMatch(/^Edited /);
  });
});
