import type { WorkspaceScore } from "@/lib/gen-ui";
import type { ScoreBand, SignalContribution, SignalSet } from "@/lib/types";

/** A stored score restored without rescoring (`/score?domain=x&view=last`). */
export type StoredWorkspaceScore = WorkspaceScore & { created_at: string };

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function isBand(value: unknown): value is ScoreBand {
  return value === "HOT" || value === "WARM" || value === "COLD";
}

/** Maps a `public.scores` row to the workspace shape. Returns null for unusable rows. */
export function storedScoreFromRow(row: Record<string, unknown> | null | undefined): StoredWorkspaceScore | null {
  if (!row) return null;
  const domain = str(row.domain);
  const score = num(row.score);
  const createdAt = str(row.created_at);
  if (!domain || score === undefined || !isBand(row.score_band) || !createdAt) return null;
  const signals = row.signals && typeof row.signals === "object" ? row.signals as SignalSet : undefined;
  return {
    company: str(row.company_name) ?? domain,
    domain,
    intent_score: score,
    score_band: row.score_band,
    ai_summary: str(row.ai_summary),
    recommended_action: str(row.recommended_action),
    buying_stage: str(row.buying_stage),
    urgency: str(row.urgency),
    why_now: str(row.why_now),
    data_coverage: num(row.data_coverage),
    score_status: str(row.score_status),
    icp_fit_score: num(row.icp_fit_score) ?? null,
    email_subject: str(row.email_subject),
    talk_track: str(row.talk_track),
    signals,
    contributions: Array.isArray(row.contributions) ? row.contributions as SignalContribution[] : undefined,
    last_updated: createdAt,
    created_at: createdAt,
  };
}
