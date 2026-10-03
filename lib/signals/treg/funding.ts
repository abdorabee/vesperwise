import { scoreFundingRounds, type FundingRoundSummary } from "@/lib/signals/funding";
import type { SignalResult } from "@/lib/types";
import { callTreg, type TregCallResult } from "@/lib/treg";

import {
  isRecord,
  tregFailureSignal,
  TREG_AVIATO_SOURCE,
  withTregMetadata,
} from "./shared";

const ENDPOINT_ID = "aviato.companies.funding_rounds";
const FALLBACK_FOR = "explorium";
const MAX_COST_USD = 0.02;
const MAX_SCORE = 25;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

interface AviatoFundingPayload {
  fundingRounds: Record<string, unknown>[];
  totalResults: unknown;
}

function readFundingPayload(data: unknown): AviatoFundingPayload | null {
  if (!isRecord(data) || !Array.isArray(data.fundingRounds)) {
    return null;
  }

  return {
    fundingRounds: data.fundingRounds.filter(isRecord),
    totalResults: data.totalResults,
  };
}

function latestRound(rounds: Record<string, unknown>[], now: Date): FundingRoundSummary {
  let latest: { announcedOn: string; date: Date; roundType?: string } | null = null;

  for (const round of rounds) {
    if (typeof round.announcedOn !== "string") {
      continue;
    }

    const date = new Date(round.announcedOn);
    if (!Number.isFinite(date.getTime()) || date.getTime() > now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS) {
      continue;
    }

    const stage = typeof round.stage === "string" ? round.stage.trim() : "";
    if (!latest || date > latest.date) {
      latest = { announcedOn: round.announcedOn, date, roundType: stage || undefined };
    }
  }

  return latest ? { lastRoundDate: latest.announcedOn, roundType: latest.roundType } : {};
}

function summarizeFunding(payload: AviatoFundingPayload, now: Date): FundingRoundSummary {
  if (payload.fundingRounds.length === 0) {
    return {};
  }

  const totalValue = payload.fundingRounds.reduce((total, round) => {
    return typeof round.moneyRaised === "number" && Number.isFinite(round.moneyRaised) && round.moneyRaised > 0
      ? total + round.moneyRaised
      : total;
  }, 0);
  const rounds = typeof payload.totalResults === "number"
    && Number.isFinite(payload.totalResults)
    && payload.totalResults >= 0
    ? payload.totalResults
    : payload.fundingRounds.length;

  return {
    ...latestRound(payload.fundingRounds, now),
    totalValue,
    rounds,
  };
}

function unexpectedPayloadSignal(result: Extract<TregCallResult, { ok: true }>): SignalResult {
  return withTregMetadata({
    score: 0,
    max: MAX_SCORE,
    detail: "Funding data unavailable",
    status: "unavailable",
    observed_at: null,
    fetched_at: new Date().toISOString(),
    source: TREG_AVIATO_SOURCE,
    evidence: [],
    metadata: { reason: "unexpected_payload" },
  }, result, FALLBACK_FOR);
}

export async function fetchTregFundingSignal(
  domain: string,
  signal?: AbortSignal,
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const result = await callTreg({
    endpointId: ENDPOINT_ID,
    method: "GET",
    query: { website: domain, perPage: 100, page: 0 },
    maxCostUsd: MAX_COST_USD,
    meta: { feature: "score", signal: "funding" },
    signal,
  });

  if (!result.ok) {
    return tregFailureSignal({
      max: MAX_SCORE,
      source: TREG_AVIATO_SOURCE,
      detail: "Funding data unavailable",
      result,
    });
  }

  const payload = readFundingPayload(result.data);
  if (!payload) {
    return unexpectedPayloadSignal(result);
  }

  const scored = scoreFundingRounds(summarizeFunding(payload, now), now, fetchedAt, TREG_AVIATO_SOURCE);
  return withTregMetadata(scored, result, FALLBACK_FOR);
}
