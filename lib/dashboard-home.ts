/**
 * Pure helpers behind the dashboard home (`app/(dashboard)/dashboard/page.tsx`).
 *
 * Everything here works on a bounded "score index": the user's most recent
 * `SCORE_INDEX_LIMIT` rows from `scores`, light columns only. No I/O, so the
 * KPI math, latest-per-domain logic and daily band bucketing are unit tested
 * in `lib/dashboard-home.test.ts`.
 */
import type { ScoreBand, SignalContribution, SignalResult } from "@/lib/types";

export const SCORE_INDEX_LIMIT = 2000;
export const HOT_ACCOUNTS_LIMIT = 8;
/** A non-HOT account counts as "rising" when its latest score beat the previous one by this much. */
export const RISING_MIN_DELTA = 10;
/** The band trend needs at least this many distinct scoring days before it is drawn as a series. */
export const TREND_MIN_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
export const BANDS: readonly ScoreBand[] = ["HOT", "WARM", "COLD"];

export const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangeKey = keyof typeof RANGE_DAYS;
export const DEFAULT_RANGE: RangeKey = "30d";

export function parseRange(value: string | string[] | undefined): RangeKey {
  const v = (Array.isArray(value) ? value[0] : value)?.toLowerCase();
  return v && v in RANGE_DAYS ? (v as RangeKey) : DEFAULT_RANGE;
}

export interface ScoreIndexRow {
  id: string;
  domain: string;
  company_name: string;
  score: number;
  score_band: ScoreBand;
  created_at: string;
}

export type BandCounts = Record<ScoreBand, number>;

const ts = (row: Pick<ScoreIndexRow, "created_at">) => new Date(row.created_at).getTime();

/** Newest row per domain, optionally as of a point in time (rows created after `asOf` are ignored). */
export function latestPerDomain(rows: readonly ScoreIndexRow[], asOf?: number): Map<string, ScoreIndexRow> {
  const latest = new Map<string, ScoreIndexRow>();
  for (const row of rows) {
    const t = ts(row);
    if (asOf != null && t > asOf) continue;
    const current = latest.get(row.domain);
    if (!current || t > ts(current)) latest.set(row.domain, row);
  }
  return latest;
}

/** The row scored immediately before the latest one, per domain. */
export function previousPerDomain(rows: readonly ScoreIndexRow[]): Map<string, ScoreIndexRow> {
  const sorted = [...rows].sort((a, b) => ts(b) - ts(a));
  const seen = new Set<string>();
  const previous = new Map<string, ScoreIndexRow>();
  for (const row of sorted) {
    if (!seen.has(row.domain)) {
      seen.add(row.domain);
    } else if (!previous.has(row.domain)) {
      previous.set(row.domain, row);
    }
  }
  return previous;
}

export function countBands(rows: Iterable<Pick<ScoreIndexRow, "score_band">>): BandCounts {
  const counts: BandCounts = { HOT: 0, WARM: 0, COLD: 0 };
  for (const row of rows) if (row.score_band in counts) counts[row.score_band] += 1;
  return counts;
}

function avgHotScore(latest: Map<string, ScoreIndexRow>): number | null {
  const hot = [...latest.values()].filter((r) => r.score_band === "HOT");
  if (hot.length === 0) return null;
  return Math.round((hot.reduce((sum, r) => sum + r.score, 0) / hot.length) * 10) / 10;
}

function hotDomains(latest: Map<string, ScoreIndexRow>): Set<string> {
  return new Set([...latest.values()].filter((r) => r.score_band === "HOT").map((r) => r.domain));
}

/** Domains that are HOT at `end` but were not HOT (or not tracked) at `start`. */
function turnedHotBetween(rows: readonly ScoreIndexRow[], start: number, end: number): number {
  const before = hotDomains(latestPerDomain(rows, start));
  let n = 0;
  for (const domain of hotDomains(latestPerDomain(rows, end))) if (!before.has(domain)) n += 1;
  return n;
}

export interface HomeKpis {
  tracked: number;
  bands: BandCounts;
  hotNow: number;
  newHot7d: number;
  avgHot: number | null;
  /** Previous-7d comparisons; null when there is no score data older than 7 days. */
  prior: { hotNow: number; newHot7d: number | null; avgHot: number | null } | null;
}

export function computeKpis(rows: readonly ScoreIndexRow[], now: number): HomeKpis {
  const latest = latestPerDomain(rows);
  const bands = countBands(latest.values());
  const weekAgo = now - 7 * DAY_MS;
  const twoWeeksAgo = now - 14 * DAY_MS;
  const hasPrior = rows.some((r) => ts(r) <= weekAgo);
  const hasPriorPrior = rows.some((r) => ts(r) <= twoWeeksAgo);

  let prior: HomeKpis["prior"] = null;
  if (hasPrior) {
    const latestWeekAgo = latestPerDomain(rows, weekAgo);
    prior = {
      hotNow: countBands(latestWeekAgo.values()).HOT,
      // "New HOT" in the week before needs data from before that week to compare against.
      newHot7d: hasPriorPrior ? turnedHotBetween(rows, twoWeeksAgo, weekAgo) : null,
      avgHot: avgHotScore(latestWeekAgo),
    };
  }

  return {
    tracked: latest.size,
    bands,
    hotNow: bands.HOT,
    newHot7d: turnedHotBetween(rows, weekAgo, now),
    avgHot: avgHotScore(latest),
    prior,
  };
}

export interface TrendDay extends BandCounts {
  /** UTC calendar date, YYYY-MM-DD. */
  date: string;
}

export interface BandTrend {
  days: TrendDay[];
  /** Distinct UTC days inside the range on which at least one score was created. */
  activeDays: number;
}

const utcDate = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Accounts per band at the end of each UTC day over the last `rangeDays` days
 * (including today), using each domain's latest score as of that day. Rows
 * older than the range seed the starting state so the first bar is correct.
 */
export function dailyBandTrend(rows: readonly ScoreIndexRow[], rangeDays: number, now: number): BandTrend {
  const sorted = [...rows].sort((a, b) => ts(a) - ts(b));
  const todayStart = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );
  const firstDayStart = todayStart - (rangeDays - 1) * DAY_MS;

  const bandByDomain = new Map<string, ScoreBand>();
  const counts: BandCounts = { HOT: 0, WARM: 0, COLD: 0 };
  const apply = (row: ScoreIndexRow) => {
    const prev = bandByDomain.get(row.domain);
    if (prev) counts[prev] -= 1;
    bandByDomain.set(row.domain, row.score_band);
    counts[row.score_band] += 1;
  };

  const active = new Set<string>();
  const days: TrendDay[] = [];
  let i = 0;
  for (let d = 0; d < rangeDays; d += 1) {
    const dayStart = firstDayStart + d * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    while (i < sorted.length && ts(sorted[i]) < dayEnd) {
      const row = sorted[i];
      if (ts(row) >= firstDayStart && ts(row) <= now) active.add(utcDate(ts(row)));
      if (row.score_band in counts) apply(row);
      i += 1;
    }
    days.push({ date: utcDate(dayStart), ...counts });
  }

  return { days, activeDays: active.size };
}

export interface HotCandidate {
  id: string;
  domain: string;
  company: string;
  score: number;
  band: ScoreBand;
  /** Latest minus previous score for the domain; null on a first score. */
  delta: number | null;
  scoredAt: string;
}

/** Top HOT accounts by score, then the biggest risers that are not HOT yet. */
export function pickHotAccounts(rows: readonly ScoreIndexRow[], limit = HOT_ACCOUNTS_LIMIT): HotCandidate[] {
  const previous = previousPerDomain(rows);
  const candidates = [...latestPerDomain(rows).values()].map<HotCandidate>((r) => {
    const prev = previous.get(r.domain);
    return {
      id: r.id,
      domain: r.domain,
      company: r.company_name || r.domain,
      score: r.score,
      band: r.score_band,
      delta: prev ? r.score - prev.score : null,
      scoredAt: r.created_at,
    };
  });

  const hot = candidates
    .filter((c) => c.band === "HOT")
    .sort((a, b) => b.score - a.score || (b.delta ?? 0) - (a.delta ?? 0) || a.company.localeCompare(b.company));
  const rising = candidates
    .filter((c) => c.band !== "HOT" && (c.delta ?? 0) >= RISING_MIN_DELTA)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0) || b.score - a.score);

  return [...hot, ...rising].slice(0, limit);
}

export interface ActivityEvent {
  id: string;
  domain: string;
  company: string;
  score: number;
  band: ScoreBand;
  /** Band of the domain's previous score when it differs from this one. */
  fromBand: ScoreBand | null;
  delta: number | null;
  createdAt: string;
}

/** Most recent score events, each compared with the same domain's prior score. */
export function recentActivity(rows: readonly ScoreIndexRow[], limit = 8, since?: number): ActivityEvent[] {
  const sorted = [...rows].sort((a, b) => ts(b) - ts(a));
  const events: ActivityEvent[] = [];
  for (let i = 0; i < sorted.length && events.length < limit; i += 1) {
    const row = sorted[i];
    if (since != null && ts(row) < since) break;
    const prev = sorted.slice(i + 1).find((r) => r.domain === row.domain);
    events.push({
      id: row.id,
      domain: row.domain,
      company: row.company_name || row.domain,
      score: row.score,
      band: row.score_band,
      fromBand: prev && prev.score_band !== row.score_band ? prev.score_band : null,
      delta: prev ? row.score - prev.score : null,
      createdAt: row.created_at,
    });
  }
  return events;
}

/** Compact relative time: "now", "5m", "3h", "2d". */
export function relTime(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const SIGNAL_LABEL: Record<string, string> = {
  funding: "Funding",
  hiring: "Hiring",
  news: "News",
  technology: "Tech stack",
  web_activity: "Web activity",
  web: "Web",
};

function formatAge(days: number): string {
  if (days < 1) return "today";
  if (days < 30) return `${Math.floor(days)}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return "1y+";
}

export interface ScoreDetail {
  signals?: Partial<Record<string, SignalResult | string>> | null;
  contributions?: SignalContribution[] | null;
  why_now?: string | null;
  ai_summary?: string | null;
  score_explanation?: string | null;
}

/** Up to `max` short chips naming the strongest stored signals, e.g. "Funding · 3d". */
export function signalChips(detail: ScoreDetail, now: number, max = 2): string[] {
  const contributions = (detail.contributions ?? []).filter((c) => c && c.contribution > 0 && SIGNAL_LABEL[c.type]);
  if (contributions.length > 0) {
    return [...contributions]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, max)
      .map((c) => (c.daysAgo != null ? `${SIGNAL_LABEL[c.type]} · ${formatAge(c.daysAgo)}` : SIGNAL_LABEL[c.type]));
  }

  const signals = detail.signals ?? {};
  return Object.entries(signals)
    .filter((entry): entry is [string, SignalResult] => {
      const s = entry[1];
      return Boolean(SIGNAL_LABEL[entry[0]]) && entry[0] !== "web" && typeof s === "object" && s != null && s.max > 0 && s.score > 0;
    })
    .sort((a, b) => b[1].score / b[1].max - a[1].score / a[1].max)
    .slice(0, max)
    .map(([key, s]) => {
      const observed = s.observed_at ? new Date(s.observed_at).getTime() : NaN;
      return Number.isFinite(observed) ? `${SIGNAL_LABEL[key]} · ${formatAge((now - observed) / DAY_MS)}` : SIGNAL_LABEL[key];
    });
}

/** First sentence of the stored why-now / summary, capped for a single line. */
export function oneLineReason(detail: ScoreDetail, maxLength = 140): string | null {
  const source = [detail.why_now, detail.ai_summary, detail.score_explanation].find((s) => s && s.trim().length > 0);
  if (!source) return null;
  const clean = source.replace(/\s+/g, " ").trim();
  const sentence = clean.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? clean;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1).trimEnd()}…` : sentence;
}

export interface CreditUsage {
  remaining: number;
  cap: number;
  /** Share of the plan allowance still available, 0–100. */
  remainingPct: number;
  low: boolean;
}

export function creditUsage(remaining: number, cap: number): CreditUsage {
  const safeRemaining = Math.max(0, remaining);
  const pct = cap > 0 ? Math.min(100, Math.round((safeRemaining / cap) * 100)) : 0;
  return { remaining: safeRemaining, cap, remainingPct: pct, low: pct < 20 };
}
