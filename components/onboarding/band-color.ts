import type { ScoreBand } from "@/lib/types";

export const BAND_COLOR: Record<ScoreBand, string> = {
  HOT: "var(--band-hot)",
  WARM: "var(--band-warm)",
  COLD: "var(--band-cold)",
};

export function bandFromScore(score: number): ScoreBand {
  if (score >= 75) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}
