import { buildTechnologySignal, type DatedTechnology } from "@/lib/signals/technology";
import type { SignalResult } from "@/lib/types";
import { callTreg, type TregCallResult } from "@/lib/treg";

import {
  isRecord,
  tregFailureSignal,
  TREG_PREDICTLEADS_SOURCE,
  withTregMetadata,
} from "./shared";

const ENDPOINT_ID = "predictleads.companies.technology_detections";
const FALLBACK_FOR = "builtwith";
const MAX_COST_USD = 0.05;
const MAX_SCORE = 20;
// A single job-post mention scores 0.25 and is not adoption evidence.
export const MIN_DETECTION_CONFIDENCE = 0.5;
// Stale last_seen_at is only a last sighting, so omitting it prevents false removal signals.
const RECENT_LAST_SEEN_WINDOW_MS = 90 * 86_400_000;
// The shared scorer expects PredictLeads detection dates as epoch seconds.
const EPOCH_SECONDS_DIVISOR = 1000;

interface TechnologyPayload {
  detections: Record<string, unknown>[];
  included: Record<string, unknown>[];
}

function readTechnologyPayload(data: unknown): TechnologyPayload | null {
  if (!isRecord(data) || !Array.isArray(data.data) || !Array.isArray(data.included)) {
    return null;
  }

  return {
    detections: data.data.filter(isRecord),
    included: data.included.filter(isRecord),
  };
}

function technologyNames(included: Record<string, unknown>[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const item of included) {
    const name = isRecord(item.attributes) ? item.attributes.name : null;
    if (item.type === "technology" && typeof item.id === "string" && typeof name === "string" && name.trim()) {
      names.set(item.id, name.trim());
    }
  }
  return names;
}

function technologyId(detection: Record<string, unknown>): string | null {
  const relationships = detection.relationships;
  if (!isRecord(relationships) || !isRecord(relationships.technology)) {
    return null;
  }

  const data = relationships.technology.data;
  return isRecord(data) && typeof data.id === "string" && data.id.trim() ? data.id : null;
}

function epochSeconds(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? Math.floor(date.getTime() / EPOCH_SECONDS_DIVISOR) : undefined;
}

function recentLastDetected(value: unknown, now: Date): number | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  const age = now.getTime() - date.getTime();
  return Number.isFinite(date.getTime()) && age >= 0 && age <= RECENT_LAST_SEEN_WINDOW_MS
    ? Math.floor(date.getTime() / EPOCH_SECONDS_DIVISOR)
    : undefined;
}

function mapDetection(
  detection: Record<string, unknown>,
  names: Map<string, string>,
  now: Date,
): DatedTechnology | null {
  if (!isRecord(detection.attributes)) {
    return null;
  }

  const score = detection.attributes.score;
  if (typeof score !== "number" || !Number.isFinite(score) || score < MIN_DETECTION_CONFIDENCE) {
    return null;
  }

  const id = technologyId(detection);
  const name = id ? names.get(id) : null;
  if (!name) {
    return null;
  }

  return {
    Name: name,
    FirstDetected: epochSeconds(detection.attributes.first_seen_at),
    LastDetected: recentLastDetected(detection.attributes.last_seen_at, now),
  };
}

function unexpectedPayloadSignal(result: Extract<TregCallResult, { ok: true }>): SignalResult {
  return withTregMetadata({
    score: 0,
    max: MAX_SCORE,
    detail: "Technology data unavailable",
    status: "unavailable",
    observed_at: null,
    fetched_at: new Date().toISOString(),
    source: TREG_PREDICTLEADS_SOURCE,
    evidence: [],
    metadata: { reason: "unexpected_payload" },
  }, result, FALLBACK_FOR);
}

export async function fetchTregTechnologySignal(
  domain: string,
  signal?: AbortSignal,
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const result = await callTreg({
    endpointId: ENDPOINT_ID,
    method: "GET",
    query: { company_id_or_domain: domain, limit: 1000 },
    maxCostUsd: MAX_COST_USD,
    meta: { feature: "score", signal: "technology" },
    signal,
  });

  if (!result.ok) {
    return tregFailureSignal({
      max: MAX_SCORE,
      source: TREG_PREDICTLEADS_SOURCE,
      detail: "Technology data unavailable",
      result,
    });
  }

  const payload = readTechnologyPayload(result.data);
  if (!payload) {
    return unexpectedPayloadSignal(result);
  }

  const names = technologyNames(payload.included);
  const technologies = payload.detections
    .map((detection) => mapDetection(detection, names, now))
    .filter((technology): technology is DatedTechnology => technology !== null);
  const scored = buildTechnologySignal(technologies, now, fetchedAt, TREG_PREDICTLEADS_SOURCE);
  return withTregMetadata(scored, result, FALLBACK_FOR);
}
