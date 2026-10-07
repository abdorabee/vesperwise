import type { SignalEvidence, SignalResult } from "@/lib/types";

const SOURCE = "explorium";
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

// Explorium API — 2-step: match domain → business_id, then enrich.
interface ExploriumMatchResponse {
  matched_businesses?: Array<{ business_id?: string }>;
}

interface ExploriumFundingFields {
  known_funding_total_value?: number;
  last_funding_round_date?: string;
  last_funding_round_type?: string;
  number_of_funding_rounds?: number;
}

interface ExploriumFundingResponse extends ExploriumFundingFields {
  data?: ExploriumFundingFields;
}

export interface FundingRoundSummary {
  lastRoundDate?: string | null;
  roundType?: string | null;
  totalValue?: number | null;
  rounds?: number | null;
}

function parseEventDate(value: string | null | undefined, now: Date): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (date.getTime() > now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS) return null;
  return date;
}

function daysSince(now: Date, eventDate: Date): number {
  return Math.max(0, Math.floor((now.getTime() - eventDate.getTime()) / 86_400_000));
}

export function scoreFundingRounds(
  summary: FundingRoundSummary,
  now: Date,
  fetchedAt: string,
  source: string = SOURCE
): SignalResult {
  const eventDate = parseEventDate(summary.lastRoundDate, now);
  const totalValue = Number.isFinite(summary.totalValue) ? summary.totalValue ?? 0 : 0;
  const rounds = Number.isFinite(summary.rounds) ? Math.max(0, summary.rounds ?? 0) : 0;
  const roundType = summary.roundType ?? "Funding";

  // Undated historical totals remain useful context but cannot be fresh intent.
  if (!eventDate) {
    const historical = totalValue > 0
      ? `$${(totalValue / 1_000_000).toFixed(0)}M total raised; latest round date unavailable`
      : "No recent funding activity detected";
    return {
      score: 0,
      max: 25,
      detail: historical,
      status: "no_signal",
      observed_at: null,
      fetched_at: fetchedAt,
      source,
      evidence: [],
      metadata: {
        total_funding_value: totalValue,
        funding_rounds: rounds,
      },
    };
  }

  const age = daysSince(now, eventDate);
  let score = 0;
  const details: string[] = [];

  if (age <= 90) {
    score += 20;
    details.push(`${roundType} closed ${age}d ago`);
  } else if (age <= 365) {
    score += 10;
    details.push(`${roundType} within last year`);
  } else if (totalValue > 0) {
    score += 5;
    details.push(`$${(totalValue / 1_000_000).toFixed(0)}M total raised`);
  }

  if (rounds >= 3) {
    score += 5;
    details.push(`${rounds} funding rounds`);
  }

  score = Math.min(score, 25);
  const evidence: SignalEvidence[] = score > 0
    ? [{
        label: `${roundType} funding event`,
        observed_at: eventDate.toISOString(),
        source,
        fetched_at: fetchedAt,
        metadata: {
          age_days: age,
          total_funding_value: totalValue,
          funding_rounds: rounds,
        },
      }]
    : [];

  return {
    score,
    max: 25,
    detail: details.join("; ") || "No recent funding activity detected",
    status: score > 0 ? "ok" : "no_signal",
    observed_at: score > 0 ? eventDate.toISOString() : null,
    fetched_at: fetchedAt,
    source,
    evidence,
    metadata: {
      total_funding_value: totalValue,
      last_funding_round_type: roundType,
      funding_rounds: rounds,
    },
  };
}

export async function fetchFundingSignal(
  domain: string,
  signal?: AbortSignal
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const apiKey = process.env.EXPLORIUM_API_KEY;

  if (!apiKey) {
    return {
      score: 0,
      max: 25,
      detail: "Funding data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: "missing_api_key" },
    };
  }

  try {
    const headers = {
      "api_key": apiKey,
      "Content-Type": "application/json",
    };

    const hostname = domain.replace(/^https?:\/\//, "").split("/")[0];
    const parts = hostname.split(".");
    const companyName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

    const matchRes = await fetch("https://api.explorium.ai/v1/businesses/match", {
      method: "POST",
      headers,
      body: JSON.stringify({ businesses_to_match: [{ domain, name: companyName }] }),
      next: { revalidate: 86400 },
      signal,
    });
    if (!matchRes.ok) throw new Error("Source unavailable");

    const matchData = (await matchRes.json()) as ExploriumMatchResponse;
    const businessId = matchData.matched_businesses?.[0]?.business_id;
    if (!businessId) {
      return {
        score: 0,
        max: 25,
        detail: "Company not found",
        status: "not_found",
        observed_at: null,
        fetched_at: fetchedAt,
        source: SOURCE,
        evidence: [],
      };
    }

    const fundingRes = await fetch(
      "https://api.explorium.ai/v1/businesses/funding_and_acquisition/enrich",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ business_id: businessId }),
        next: { revalidate: 86400 },
        signal,
      }
    );
    if (!fundingRes.ok) throw new Error("Source unavailable");

    const raw = (await fundingRes.json()) as ExploriumFundingResponse;
    const funding: ExploriumFundingFields = raw.data ?? raw;
    return scoreFundingRounds({
      lastRoundDate: funding.last_funding_round_date,
      roundType: funding.last_funding_round_type,
      totalValue: funding.known_funding_total_value,
      rounds: funding.number_of_funding_rounds,
    }, now, fetchedAt, SOURCE);
  } catch (error) {
    return {
      score: 0,
      max: 25,
      detail: "Funding data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: error instanceof Error ? error.message : "unknown_error" },
    };
  }
}
