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
