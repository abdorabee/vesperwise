import type { IntentScore, PersonIntentScore, ScoreBand } from "@/lib/types";

export type ScoreKind = "domain" | "person";

export interface NestedCompanyScore {
  company: string;
  domain: string;
  score: number;
  band: ScoreBand;
}

export interface ScoreRecordData {
  id: string;
  kind: ScoreKind;
  target: string;
  company: string;
  domain: string | null;
  email: string | null;
  score: number;
  band: ScoreBand;
  whyNow: string;
  action: string;
  updatedAt: string;
  cached: boolean;
  thinCoverage: boolean;
  companyScore: NestedCompanyScore | null;
  owner: string;
}

export function recordFromCompany(result: IntentScore & { intent_score: number; score_band: ScoreBand }, id?: string): ScoreRecordData {
  const coverage = result.data_coverage ?? result.confidence ?? 1;
  return {
    id: id ?? `domain:${result.domain}`,
    kind: "domain",
    target: result.domain,
    company: result.company || result.domain,
    domain: result.domain,
    email: null,
    score: result.intent_score,
    band: result.score_band,
    whyNow: result.why_now || result.ai_summary || "",
    action: result.recommended_action || "",
    updatedAt: result.last_updated || new Date().toISOString(),
    cached: Boolean(result.cached),
    thinCoverage: coverage < 0.6,
    companyScore: null,
    owner: "You",
  };
}

export function recordFromPerson(
  result: PersonIntentScore,
  id?: string,
  companyScore?: NestedCompanyScore | null,
): ScoreRecordData {
  const email = result.person_email;
  return {
    id: id ?? `person:${email ?? result.person_name}`,
    kind: "person",
    target: result.person_name || email || "Person",
    company: result.person_company || "",
    domain: result.person_domain,
    email,
    score: result.intent_score,
    band: result.score_band,
    whyNow: result.why_now || result.ai_summary || "",
    action: result.recommended_action || "",
    updatedAt: result.last_updated || new Date().toISOString(),
    cached: false,
    thinCoverage: false,
    companyScore: companyScore ?? null,
    owner: "You",
  };
}

export function isScorePayload(value: unknown): value is { intent_score: number; score_band: ScoreBand } {
  if (!value || typeof value !== "object") return false;
  const row = value as { intent_score?: unknown; score_band?: unknown };
  return typeof row.intent_score === "number" && (row.score_band === "HOT" || row.score_band === "WARM" || row.score_band === "COLD");
}
