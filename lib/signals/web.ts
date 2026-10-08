import type { SignalResult } from "@/lib/types";

const SOURCE = "open-page-rank";

// Open PageRank API (free — 100 req/day)
// Sign up at: https://www.domcop.com/openpagerank/
interface OPRResponse {
  response?: Array<{
    page_rank_integer?: number;
    rank?: string;
    status_code?: number;
  }>;
}

export async function fetchWebSignal(
  domain: string,
  signal?: AbortSignal
): Promise<SignalResult> {
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.OPEN_PAGE_RANK_API_KEY;

  if (!apiKey) {
    return {
      score: 0,
      max: 15,
      detail: "Web authority data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: "missing_api_key", context_only: true },
    };
  }

  try {
    const url = `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${domain}`;
    const res = await fetch(url, {
      headers: { "API-OPR": apiKey },
      next: { revalidate: 86400 },
      signal,
    });

    if (!res.ok) throw new Error("Source unavailable");

    const data = (await res.json()) as OPRResponse;
    const result = data.response?.[0];

    if (!result || result.status_code !== 200) {
      return {
        score: 0,
        max: 15,
        detail: "Domain not indexed",
        status: "not_found",
        observed_at: null,
        fetched_at: fetchedAt,
        source: SOURCE,
        evidence: [],
        metadata: { context_only: true },
      };
    }

    const opr = result.page_rank_integer ?? 0;
    const globalRank = result.rank ? parseInt(result.rank) : null;

    let score: number;

    // Inverted-U curve: rewards growing mid-market (rank 3-5) over large enterprises.
    // Mid-market companies are the most active B2B tool buyers.
    if (opr >= 8) score = 7;
    else if (opr >= 6) score = 10;
    else if (opr >= 3) score = 13;
    else if (opr >= 1) score = 6;
    else score = 3;

    let detail = opr >= 1
      ? `Web presence ${opr}/10`
      : "New domain — limited web presence";

    if (globalRank && globalRank <= 100_000) {
      detail += ` — top 100K globally`;
    }

    return {
      score,
      max: 15,
      detail,
      status: "ok",
      observed_at: fetchedAt,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [{
        label: `Web presence ${opr}/10`,
        observed_at: fetchedAt,
        source: SOURCE,
        fetched_at: fetchedAt,
        metadata: { global_rank: globalRank },
      }],
      metadata: { page_rank: opr, global_rank: globalRank, context_only: true },
    };
  } catch (error) {
    return {
      score: 0,
      max: 15,
      detail: "Web authority data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: {
        reason: error instanceof Error ? error.message : "unknown_error",
        context_only: true,
      },
    };
  }
}
