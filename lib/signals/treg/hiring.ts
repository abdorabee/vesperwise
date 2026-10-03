import { buildHiringSignalFromJobs, type HiringJob } from "@/lib/signals/hiring";
import type { SignalResult } from "@/lib/types";
import { callTreg, type TregCallResult } from "@/lib/treg";

import {
  daysAgoIsoDate,
  isRecord,
  tregFailureSignal,
  TREG_PREDICTLEADS_SOURCE,
  withTregMetadata,
} from "./shared";

const ENDPOINT_ID = "predictleads.companies.job_openings";
const FALLBACK_FOR = "explorium-events";
const MAX_COST_USD = 0.05;
const MAX_SCORE = 20;

interface PredictLeadsJobsPayload {
  rows: Record<string, unknown>[];
  crawlerPotentiallyBlocked?: boolean;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readJobsPayload(data: unknown): PredictLeadsJobsPayload | null {
  if (!isRecord(data) || !Array.isArray(data.data)) {
    return null;
  }

  const meta = isRecord(data.meta) ? data.meta : {};
  const crawlerPotentiallyBlocked = typeof meta.crawler_potentially_blocked === "boolean"
    ? meta.crawler_potentially_blocked
    : undefined;

  return {
    rows: data.data.filter(isRecord),
    crawlerPotentiallyBlocked,
  };
}

function firstCategory(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const first = value.find((item) => typeof item === "string" && item.trim());
  return stringOrNull(first);
}

function mapJob(row: Record<string, unknown>): HiringJob | null {
  if (!isRecord(row.attributes)) {
    return null;
  }

  const title = stringOrNull(row.attributes.title);
  if (!title) {
    return null;
  }

  return {
    title,
    department: firstCategory(row.attributes.categories),
    location: stringOrNull(row.attributes.location),
    posted_at: stringOrNull(row.attributes.posted_at) ?? stringOrNull(row.attributes.first_seen_at),
    source_url: stringOrNull(row.attributes.url),
    requisition_id: stringOrNull(row.id),
  };
}

function addCrawlerMetadata(signal: SignalResult, blocked: boolean | undefined): SignalResult {
  if (blocked === undefined) {
    return signal;
  }

  return {
    ...signal,
    metadata: {
      ...signal.metadata,
      crawler_potentially_blocked: blocked,
    },
  };
}

function unexpectedPayloadSignal(result: Extract<TregCallResult, { ok: true }>): SignalResult {
  return withTregMetadata({
    score: 0,
    max: MAX_SCORE,
    detail: "Hiring data unavailable",
    status: "unavailable",
    observed_at: null,
    fetched_at: new Date().toISOString(),
    source: TREG_PREDICTLEADS_SOURCE,
    evidence: [],
    metadata: { reason: "unexpected_payload" },
  }, result, FALLBACK_FOR);
}

export async function fetchTregHiringSignal(
  domain: string,
  signal?: AbortSignal,
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const result = await callTreg({
    endpointId: ENDPOINT_ID,
    method: "GET",
    query: {
      company_id_or_domain: domain,
      not_closed: true,
      first_seen_at_from: daysAgoIsoDate(now, 90),
      limit: 100,
    },
    maxCostUsd: MAX_COST_USD,
    meta: { feature: "score", signal: "hiring" },
    signal,
  });

  if (!result.ok) {
    return tregFailureSignal({
      max: MAX_SCORE,
      source: TREG_PREDICTLEADS_SOURCE,
      detail: "Hiring data unavailable",
      result,
    });
  }

  const payload = readJobsPayload(result.data);
  if (!payload) {
    return unexpectedPayloadSignal(result);
  }

  const jobs = payload.rows.map(mapJob).filter((job): job is HiringJob => job !== null);
  const scored = buildHiringSignalFromJobs(jobs, fetchedAt, TREG_PREDICTLEADS_SOURCE);
  return withTregMetadata(addCrawlerMetadata(scored, payload.crawlerPotentiallyBlocked), result, FALLBACK_FOR);
}
