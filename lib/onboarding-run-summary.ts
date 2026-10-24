import type { ScoringRunEntry } from "@/lib/onboarding-run";

export interface RunSummary {
  total: number;
  doneCount: number;
  failedCount: number;
  /** The run finished and every entry reached a final status. */
  settled: boolean;
  /** Settled with nothing scored: every preview account failed or was unscorable. */
  allFailed: boolean;
  /** Whether the run screen's primary button may move the user on. */
  canContinue: boolean;
  continueLabel: string;
}

/**
 * Footer state for the onboarding run screen. Kept pure so the all-failed
 * case is tested directly: when no preview account can be scored (e.g. no
 * signal sources configured, every POST /api/v1/score answers 422), the user
 * must still be able to save the profile and leave, or onboarding never
 * completes and every dashboard route bounces back to /onboarding.
 */
export function summarizeRun(entries: ScoringRunEntry[], running: boolean): RunSummary {
  const total = entries.length;
  const doneCount = entries.filter((e) => e.status === "done").length;
  const failedCount = entries.filter((e) => e.status === "error").length;
  const settled = !running && total > 0 && doneCount + failedCount === total;
  const allFailed = settled && doneCount === 0;

  return {
    total,
    doneCount,
    failedCount,
    settled,
    allFailed,
    canContinue: doneCount > 0 || settled,
    continueLabel: allFailed ? "Save and continue without scores" : `See the ${doneCount} ready now`,
  };
}
