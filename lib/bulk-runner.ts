import { InsufficientCreditsError } from "@/lib/score-service";

export interface BulkScoreOutcome {
  cached: boolean;
  charged: boolean;
}

export interface BulkRunSummary<T> {
  results: T[];
  errors: Array<{ index: number; message: string }>;
  charged: number;
  cached: number;
  stopped: boolean;
}

function isInsufficientCredits(error: unknown): boolean {
  return error instanceof InsufficientCreditsError ||
    (error instanceof Error && error.name === "InsufficientCreditsError");
}

/**
 * Score companies one at a time. Cache hits are free. A rejected charge stops
 * the job so later companies are not attempted. The scorer must debit atomically
 * (begin_score_run locks the balance) so two jobs cannot overspend.
 */
export async function runBulkScores<T extends BulkScoreOutcome>(
  companies: readonly unknown[],
  score: (company: unknown, index: number) => Promise<T>,
): Promise<BulkRunSummary<T>> {
  const results: T[] = [];
  const errors: Array<{ index: number; message: string }> = [];
  let charged = 0;
  let cached = 0;

  for (let index = 0; index < companies.length; index += 1) {
    try {
      const result = await score(companies[index], index);
      results.push(result);
      if (result.charged) charged += 1;
      if (result.cached) cached += 1;
    } catch (error) {
      if (isInsufficientCredits(error)) {
        return { results, errors, charged, cached, stopped: true };
      }
      errors.push({
        index,
        message: error instanceof Error ? error.message : "Scoring failed",
      });
    }
  }

  return { results, errors, charged, cached, stopped: false };
}
