import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveDataRefs } from "./sandbox-data";
import type { SignalContribution, SignalResult, SignalSet } from "./types";

type TableRow = Record<string, unknown>;

function signal(overrides: Partial<SignalResult> = {}): SignalResult {
  return {
    score: 10,
    max: 20,
    detail: "BuiltWith Free API says Snowflake adoption",
    status: "ok",
    observed_at: "2026-10-05T00:00:00.000Z",
    source: "builtwith",
    fetched_at: "2026-10-06T00:00:00.000Z",
    ...overrides,
  };
}

function signals(): SignalSet {
  return {
    funding: signal({ detail: "Series B reported by GNews" }),
    hiring: signal({ detail: "Hiring sales leaders" }),
    news: signal({ score: 0, detail: "No news", status: "no_signal", observed_at: null }),
    technology: signal(),
    web: signal({ detail: "Open PageRank 7/10" }),
    github: signal({ detail: "No GitHub signal", status: "no_signal", observed_at: null }),
    latestSignalDate: "2026-10-05T00:00:00.000Z",
  };
}

function contribution(overrides: Partial<SignalContribution> = {}): SignalContribution {
  return {
    type: "funding",
    status: "ok",
    rawScore: 80,
    decayedScore: 76,
    freshness: 0.9,
    daysAgo: 2,
    summary: "BuiltWith Free API and OpenRouter should not leak",
    baseWeight: 25,
    effectiveWeight: 25,
    contribution: 20,
    observedAt: "2026-10-05T00:00:00.000Z",
    ...overrides,
  };
}

function makeScore(overrides: TableRow = {}): TableRow {
  return {
    user_id: "user_1",
    domain: "notion.so",
    company_name: "Notion",
    score: 84,
    score_band: "HOT",
    created_at: "2026-10-08T00:00:00.000Z",
    signals: signals(),
    contributions: [contribution()],
    brief: {
      version: 1,
      headline: "OpenRouter should not leak",
      personas: ["VP Sales"],
      openers: { funding: { "VP Sales": "GNews says timing is strong" } },
      layout: [{ type: "score_hero" }],
    },
    ...overrides,
  };
}

class QueryBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;

  constructor(
    private table: string,
    private rows: Record<string, TableRow[]>,
    private calls: Array<{ table: string; method: string; args: unknown[] }>,
  ) {}

  select(...args: unknown[]) {
    this.calls.push({ table: this.table, method: "select", args });
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push({ table: this.table, method: "eq", args: [column, value] });
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.calls.push({ table: this.table, method: "order", args: [column, options] });
    this.orderBy = { column, ascending: options.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.calls.push({ table: this.table, method: "limit", args: [count] });
    this.limitCount = count;
    return this;
  }

  single() {
    const data = this.execute()[0] ?? null;
    return Promise.resolve({ data, error: data ? null : { message: "not found" } });
  }

  then<TResult1 = { data: TableRow[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: TableRow[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.execute(), error: null }).then(onfulfilled, onrejected);
  }

  private execute() {
    let data = [...(this.rows[this.table] ?? [])];
    for (const filter of this.filters) {
      data = data.filter((row) => row[filter.column] === filter.value);
    }
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      data.sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        return ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    return this.limitCount === null ? data : data.slice(0, this.limitCount);
  }
}

function mockSupabase(rows: Record<string, TableRow[]>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  return {
    calls,
    from(table: string) {
      return new QueryBuilder(table, rows, calls);
    },
  };
}

describe("resolveDataRefs", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves account refs using the requested user_id scope", async () => {
    const supabase = mockSupabase({
      scores: [
        makeScore({ user_id: "other_user", score: 99 }),
        makeScore({ user_id: "user_1", score: 84 }),
      ],
    });

    const result = await resolveDataRefs(supabase, "user_1", ["account:notion.so"]);

    expect(supabase.calls).toContainEqual({ table: "scores", method: "eq", args: ["user_id", "user_1"] });
    expect(result["account:notion.so"]).toMatchObject({
      company: "Notion",
      domain: "notion.so",
      score: 84,
      band: "HOT",
      contributions: [{ type: "funding", summary: "public data and public data should not leak" }],
      brief: {
        personas: ["VP Sales"],
        openers: { funding: { "VP Sales": "public data says timing is strong" } },
      },
    });
  });

  it("returns not_found for domains owned only by another user", async () => {
    const supabase = mockSupabase({
      scores: [makeScore({ user_id: "other_user", score: 99 })],
    });

    await expect(resolveDataRefs(supabase, "user_1", ["account:notion.so"])).resolves.toEqual({
      "account:notion.so": { error: "not_found" },
    });
  });

  it("scrubs vendor names and public source identifiers from account payloads", async () => {
    const supabase = mockSupabase({ scores: [makeScore()] });

    const result = await resolveDataRefs(supabase, "user_1", ["account:notion.so"]);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/BuiltWith|GNews|OpenRouter/i);
    expect(result["account:notion.so"]).toMatchObject({
      signals: {
        technology: { detail: "public data says Snowflake adoption" },
      },
    });
  });

  it("returns recent distinct accounts with freshness aged from the stored score time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T00:00:00.000Z"));
    const supabase = mockSupabase({
      scores: [
        makeScore({ domain: "notion.so", company_name: "Notion", score: 84, created_at: "2026-10-08T00:00:00.000Z", contributions: [contribution({ daysAgo: 1 })] }),
        makeScore({ domain: "notion.so", company_name: "Notion Older", score: 72, created_at: "2026-10-01T00:00:00.000Z", contributions: [contribution({ daysAgo: 0 })] }),
        makeScore({ domain: "linear.app", company_name: "Linear", score: 61, score_band: "WARM", created_at: "2026-10-09T00:00:00.000Z", contributions: [] }),
      ],
    });

    const result = await resolveDataRefs(supabase, "user_1", ["accounts:recent"]);

    expect(result["accounts:recent"]).toEqual([
      { domain: "linear.app", company: "Linear", score: 61, band: "WARM", scored_at: "2026-10-09T00:00:00.000Z", freshest_signal_days: 1 },
      { domain: "notion.so", company: "Notion", score: 84, band: "HOT", scored_at: "2026-10-08T00:00:00.000Z", freshest_signal_days: 3 },
    ]);
  });
});
