import type { SignalEvidence, SignalResult } from "@/lib/types";

const SOURCE = "builtwith";

export interface DatedTechnology {
  Name: string;
  FirstDetected?: number;
  LastDetected?: number;
}

export type BuiltWithTechnology = DatedTechnology;

interface BuiltWithResult {
  Results?: Array<{
    Result?: {
      Paths?: Array<{
        Technologies?: BuiltWithTechnology[];
      }>;
    };
  }>;
  // The free endpoint returns category aggregates rather than technology-level
  // records. Those aggregates cannot establish a dated adoption/removal event.
  domain?: string;
  groups?: Array<{
    name?: string;
    categories?: Array<{ name?: string }>;
  }>;
}

const CRM_AND_SALES_TOOLS = [
  "HubSpot", "Salesforce", "Pipedrive", "Zoho CRM", "Monday.com",
  "Outreach", "SalesLoft", "Apollo", "Marketo", "Pardot",
  "ActiveCampaign", "Klaviyo", "Intercom", "Drift",
];

const NINETY_DAYS_MS = 90 * 86_400_000;

function epochSecondsToDate(value: number | undefined, now: Date): Date | null {
  if (!Number.isFinite(value) || !value || value <= 0) return null;
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  if (date.getTime() - now.getTime() > 86_400_000) return null;
  return date;
}

function isRelevantTechnology(name: string): boolean {
  const lower = name.toLowerCase();
  return CRM_AND_SALES_TOOLS.some((tool) => lower.includes(tool.toLowerCase()));
}

interface TechnologyScoreResult {
  score: number;
  details: string[];
  evidence: SignalEvidence[];
  observedAt: string | null;
  activeTools: string[];
}

export function scoreTechnologyChanges(
  input: DatedTechnology[],
  now = new Date(),
  fetchedAt = now.toISOString(),
  source: string = SOURCE
): TechnologyScoreResult {
  const deduplicated = new Map<string, DatedTechnology>();

  for (const technology of input) {
    if (!technology.Name || !isRelevantTechnology(technology.Name)) continue;
    const key = technology.Name.toLowerCase();
    const existing = deduplicated.get(key);
    if (!existing) {
      deduplicated.set(key, { ...technology });
      continue;
    }

    const firstCandidates = [existing.FirstDetected, technology.FirstDetected]
      .filter((value): value is number => Number.isFinite(value) && (value ?? 0) > 0);
    const lastCandidates = [existing.LastDetected, technology.LastDetected]
      .filter((value): value is number => Number.isFinite(value) && (value ?? 0) > 0);
    deduplicated.set(key, {
      Name: existing.Name,
      FirstDetected: firstCandidates.length > 0 ? Math.min(...firstCandidates) : undefined,
      LastDetected: lastCandidates.length > 0 ? Math.max(...lastCandidates) : undefined,
    });
  }

  let score = 0;
  const details: string[] = [];
  const evidence: SignalEvidence[] = [];
  const activeTools: string[] = [];

  for (const technology of deduplicated.values()) {
    const firstDetected = epochSecondsToDate(technology.FirstDetected, now);
    const lastDetected = epochSecondsToDate(technology.LastDetected, now);
    const firstAge = firstDetected ? now.getTime() - firstDetected.getTime() : Number.POSITIVE_INFINITY;
    const lastAge = lastDetected ? now.getTime() - lastDetected.getTime() : Number.POSITIVE_INFINITY;

    if (firstDetected && firstAge <= NINETY_DAYS_MS) {
      score += 15;
      details.push(`New: ${technology.Name}`);
      evidence.push({
        label: `Adopted ${technology.Name}`,
        observed_at: firstDetected.toISOString(),
        source,
        fetched_at: fetchedAt,
        metadata: { change: "adopted", points: 15 },
      });
      continue;
    }

    if (firstDetected && lastDetected && lastAge > NINETY_DAYS_MS) {
      score += 10;
      details.push(`Removed: ${technology.Name} (migration signal)`);
      evidence.push({
        label: `Last detected ${technology.Name}`,
        observed_at: lastDetected.toISOString(),
        source,
        fetched_at: fetchedAt,
        metadata: { change: "removed", points: 10 },
      });
      continue;
    }

    if (lastDetected) activeTools.push(technology.Name);
  }

  const cappedScore = Math.min(score, 20);
  const latestEvidence = evidence.reduce<Date | null>((latest, item) => {
    const date = item.observed_at ? new Date(item.observed_at) : null;
    return date && (!latest || date > latest) ? date : latest;
  }, null);

  return {
    score: cappedScore,
    details,
    evidence,
    observedAt: cappedScore > 0 ? latestEvidence?.toISOString() ?? null : null,
    activeTools,
  };
}

export function buildTechnologySignal(
  technologies: DatedTechnology[],
  now: Date,
  fetchedAt: string,
  source: string = SOURCE
): SignalResult {
  const result = scoreTechnologyChanges(technologies, now, fetchedAt, source);
  const context = result.activeTools.length > 0
    ? `; active stack: ${result.activeTools.slice(0, 3).join(", ")}`
    : "";

  return {
    score: result.score,
    max: 20,
    detail: result.details.length > 0
      ? `${result.details.join("; ")}${context}`
      : `No dated tech stack changes detected${context}`,
    status: result.score > 0 && result.observedAt ? "ok" : "no_signal",
    observed_at: result.observedAt,
    fetched_at: fetchedAt,
    source,
    evidence: result.evidence,
    metadata: { active_tools: result.activeTools },
  };
}

export async function fetchTechnologySignal(
  domain: string,
  signal?: AbortSignal
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const apiKey = process.env.BUILTWITH_API_KEY;

  if (!apiKey) {
    return {
      score: 0,
      max: 20,
      detail: "Technology data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: "missing_api_key" },
    };
  }

  try {
    const url = `https://api.builtwith.com/free1/api.json?KEY=${apiKey}&LOOKUP=${domain}`;
    const res = await fetch(url, { next: { revalidate: 86400 }, signal });
    if (!res.ok) throw new Error("Source unavailable");

    const data = (await res.json()) as BuiltWithResult;
    const matchedResult = data.Results?.[0]?.Result;
    if (!matchedResult) {
      if (data.domain && Array.isArray(data.groups)) {
        return {
          score: 0,
          max: 20,
          detail: "Technology data unavailable",
          status: "unavailable",
          observed_at: null,
          fetched_at: fetchedAt,
          source: SOURCE,
          evidence: [],
          metadata: {
            reason: "insufficient_provider_detail",
            provider_schema: "free1",
          },
        };
      }
      return {
        score: 0,
        max: 20,
        detail: "Domain not found in technology data",
        status: "not_found",
        observed_at: null,
        fetched_at: fetchedAt,
        source: SOURCE,
        evidence: [],
      };
    }
    const technologies =
      matchedResult.Paths?.flatMap((path) => path.Technologies ?? []) ?? [];
    return buildTechnologySignal(technologies, now, fetchedAt, SOURCE);
  } catch (error) {
    return {
      score: 0,
      max: 20,
      detail: "Technology data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: error instanceof Error ? error.message : "unknown_error" },
    };
  }
}
