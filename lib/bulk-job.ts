import { InsufficientCreditsError } from "@/lib/score-service";
import { runBulkScores, type BulkScoreOutcome } from "@/lib/bulk-runner";

export const BULK_BATCH_SIZE = 20;
export const BULK_TIME_BUDGET_MS = 40_000;
export const BULK_STALE_MS = 15 * 60 * 1000;

export interface BulkCompanyInput {
  domain?: string;
  name?: string;
}

export interface BulkScoredRow extends BulkScoreOutcome {
  domain: string;
  company_name: string;
  intent_score: number | null;
  score_band: string | null;
}

export interface BulkJobState {
  companies: BulkCompanyInput[];
  cursor: number;
  scored: BulkScoredRow[];
  errors: Array<{ index: number; message: string }>;
  credits_charged: number;
  stopped: "insufficient_credits" | "error" | "stale" | null;
  partial: boolean;
  touched_at: string;
}

export function freshBulkState(companies: BulkCompanyInput[], now = new Date()): BulkJobState {
  return {
    companies,
    cursor: 0,
    scored: [],
    errors: [],
    credits_charged: 0,
    stopped: null,
    partial: false,
    touched_at: now.toISOString(),
  };
}

export function isBulkState(value: unknown): value is BulkJobState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<BulkJobState>;
  return Array.isArray(state.companies) && typeof state.cursor === "number" && Array.isArray(state.scored);
}

export function bulkJobStatus(state: BulkJobState): "processing" | "completed" | "failed" {
  if (state.stopped === "error" || state.stopped === "stale") return "failed";
  if (state.stopped === "insufficient_credits" || state.cursor >= state.companies.length) return "completed";
  return "processing";
}

export function isBulkJobStale(createdAt: string, state: BulkJobState | null, now: number): boolean {
  const touched = state?.touched_at ?? createdAt;
  const at = new Date(touched).getTime();
  return Number.isFinite(at) && now - at >= BULK_STALE_MS;
}

/**
 * Score the next batch. A credit rejection stops the job. Cache hits are free.
 * The scorer must debit atomically so concurrent jobs cannot overspend.
 */
export async function advanceBulkState(
  state: BulkJobState,
  score: (company: BulkCompanyInput, index: number) => Promise<BulkScoredRow>,
  now = new Date(),
): Promise<BulkJobState> {
  if (bulkJobStatus(state) !== "processing") {
    return { ...state, touched_at: now.toISOString() };
  }

  const slice = state.companies.slice(state.cursor, state.cursor + BULK_BATCH_SIZE);
  const summary = await runBulkScores(slice, (company, offset) =>
    score(company as BulkCompanyInput, state.cursor + offset),
  );
  const attempted = summary.results.length + summary.errors.length;

  return {
    ...state,
    cursor: state.cursor + attempted,
    scored: [...state.scored, ...summary.results],
    errors: [
      ...state.errors,
      ...summary.errors.map((error) => ({ index: state.cursor + error.index, message: error.message })),
    ],
    credits_charged: state.credits_charged + summary.charged,
    stopped: summary.stopped ? "insufficient_credits" : state.stopped,
    partial: summary.stopped || state.scored.length + summary.results.length < state.companies.length,
    touched_at: now.toISOString(),
  };
}

export async function runBulkWindow(
  state: BulkJobState,
  score: (company: BulkCompanyInput, index: number) => Promise<BulkScoredRow>,
  budgetMs = BULK_TIME_BUDGET_MS,
  now = Date.now(),
): Promise<BulkJobState> {
  let current = state;
  const deadline = now + budgetMs;
  while (bulkJobStatus(current) === "processing" && Date.now() < deadline) {
    current = await advanceBulkState(current, score, new Date());
  }
  return current;
}

export function failBulkState(state: BulkJobState, reason: "error" | "stale", now = new Date()): BulkJobState {
  return {
    ...state,
    stopped: reason,
    partial: state.scored.length > 0 && state.cursor < state.companies.length,
    touched_at: now.toISOString(),
  };
}

export function bulkScoreIdempotencyKey(jobId: string, index: number): string {
  return `bulk:${jobId}:${index}`;
}

export function isCreditStop(error: unknown): boolean {
  return error instanceof InsufficientCreditsError
    || (error instanceof Error && error.name === "InsufficientCreditsError");
}
