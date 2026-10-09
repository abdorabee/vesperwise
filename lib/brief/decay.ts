import type { ScoreBand } from "../types";
import { TRIGGER_KEYS, type TriggerKey } from "./brief-schema";
import type { BriefContribution } from "./brief-data";

const ZERO_PER_SIGNAL: Record<TriggerKey, number> = {
  funding: 0,
  hiring: 0,
  news: 0,
  technology: 0,
};

function getScoreBand(score: number): ScoreBand {
  if (score >= 75) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function freshnessFor(contribution: BriefContribution, offsetDays: number, overridden: boolean): number {
  if (overridden) return 1;
  if (contribution.status === "no_signal" || contribution.daysAgo === null) return 1;
  const ageDays = Math.max(0, contribution.daysAgo + Math.max(0, offsetDays));
  if (typeof contribution.halfLifeDays === "number" && contribution.halfLifeDays > 0) {
    return Math.pow(2, -ageDays / contribution.halfLifeDays);
  }
  return Math.pow(0.85, ageDays / 30);
}

export function projectScore(
  contributions: BriefContribution[],
  offsetDays: number,
  overrides: Partial<Record<TriggerKey, "max">> = {},
): { score: number; band: ScoreBand; perSignal: Record<TriggerKey, number> } {
  const triggerContributions = contributions.filter((item) =>
    (TRIGGER_KEYS as readonly string[]).includes(item.type)
  );
  const effectiveWeightTotal = triggerContributions.reduce(
    (sum, item) => sum + (Number.isFinite(item.effectiveWeight) ? Math.max(0, item.effectiveWeight) : 0),
    0,
  );
  const perSignal: Record<TriggerKey, number> = { ...ZERO_PER_SIGNAL };

  if (effectiveWeightTotal > 0) {
    for (const contribution of triggerContributions) {
      const weight = Number.isFinite(contribution.effectiveWeight)
        ? Math.max(0, contribution.effectiveWeight)
        : 0;
      const overridden = overrides[contribution.type] === "max";
      const rawScore = overridden ? 100 : contribution.rawScore;
      const projected = rawScore * freshnessFor(contribution, offsetDays, overridden) * weight / effectiveWeightTotal;
      perSignal[contribution.type] = clampScore(projected);
    }
  }

  const score = clampScore(Math.round(Object.values(perSignal).reduce((sum, value) => sum + value, 0)));
  return { score, band: getScoreBand(score), perSignal };
}
