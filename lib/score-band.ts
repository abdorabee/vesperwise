import type { ScoreBand } from "@/lib/types";

/**
 * Band thresholds from lib/scorer.ts: HOT >= 75, WARM >= 50, COLD < 50.
 * Lives in lib/ (not in a "use client" component file) so server code can call it.
 */
export const BAND_THRESHOLDS = { warm: 50, hot: 75 } as const;

export function bandForScore(score: number): ScoreBand {
  if (score >= BAND_THRESHOLDS.hot) return "HOT";
  if (score >= BAND_THRESHOLDS.warm) return "WARM";
  return "COLD";
}
