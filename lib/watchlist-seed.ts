import type { ScoreBand } from "@/lib/types";

export interface WatchlistScoreFields {
  score: number;
  score_band: ScoreBand;
  last_scored: string;
}

const BANDS: readonly ScoreBand[] = ["HOT", "WARM", "COLD"];

/**
 * Score columns to copy onto a watchlist row from the user's latest `scores`
 * row, so an account saved after it was scored shows that score right away
 * instead of "—" until the next rescore. Returns {} when there is nothing usable.
 */
export function watchlistScoreFields(
  row: { score?: unknown; score_band?: unknown; created_at?: unknown } | null | undefined,
): WatchlistScoreFields | Record<string, never> {
  if (!row) return {};
  const { score, score_band: band, created_at: createdAt } = row;
  if (typeof score !== "number" || !Number.isFinite(score)) return {};
  if (typeof band !== "string" || !BANDS.includes(band as ScoreBand)) return {};
  if (typeof createdAt !== "string" || !createdAt) return {};
  return { score, score_band: band as ScoreBand, last_scored: createdAt };
}

export interface LatestScoreRow {
  score: number;
  score_band?: string | null;
  created_at: string;
}

function bandFromScore(score: number): ScoreBand {
  if (score >= 75) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}

function isScoreBand(value: string | null | undefined): value is ScoreBand {
  return value === "HOT" || value === "WARM" || value === "COLD";
}

/**
 * Watchlist.score is a snapshot copied at save time. History and the score
 * view read the latest `scores` row, so the list must too.
 */
export function liveWatchlistScore<T extends {
  score: number | null;
  score_band: ScoreBand | null;
  last_scored: string | null;
  previous_score: number | null;
}>(entry: T, historyNewestFirst: readonly LatestScoreRow[]): T {
  const latest = historyNewestFirst[0];
  if (!latest || typeof latest.score !== "number" || !Number.isFinite(latest.score)) return entry;
  const previous = historyNewestFirst[1];
  return {
    ...entry,
    score: latest.score,
    score_band: isScoreBand(latest.score_band) ? latest.score_band : bandFromScore(latest.score),
    last_scored: latest.created_at,
    previous_score: previous && typeof previous.score === "number" ? previous.score : entry.previous_score,
  };
}
