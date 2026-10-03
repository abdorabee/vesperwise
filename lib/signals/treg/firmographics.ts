import type { SignalStatus } from "@/lib/types";
import { callTreg, type TregCallResult } from "@/lib/treg";

import {
  isRecord,
  tregFailureStatus,
} from "./shared";

const ENDPOINT_ID = "hunter.companies.enrich";
const MAX_COST_USD = 0.01;

export interface TregFirmographicsResult {
  status: SignalStatus;
  industry: string | null;
  employeeRange: string | null;
  callId: string | null;
  costMicro: number | null;
  reason?: string;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fallbackCount(count: unknown): string | null {
  return typeof count === "number" && Number.isFinite(count) && count > 0
    ? String(Math.round(count))
    : null;
}

function normalizeCountToken(value: string): string | null {
  const match = value.trim().toUpperCase().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)([KM])?$/);
  if (!match) {
    return null;
  }

  const number = Number(match[1]);
  const multiplier = match[2] === "M" ? 1_000_000 : match[2] === "K" ? 1_000 : 1;
  return Number.isFinite(number) && number > 0 ? String(Math.round(number * multiplier)) : null;
}

function parseRange(value: string): string | null {
  const compact = value.replace(/\s+/g, "");
  if (compact.endsWith("+")) {
    const lower = normalizeCountToken(compact.slice(0, -1));
    return lower ? `${lower}+` : null;
  }

  const parts = compact.split("-");
  if (parts.length === 2) {
    const lower = normalizeCountToken(parts[0] ?? "");
    const upper = normalizeCountToken(parts[1] ?? "");
    return lower && upper ? `${lower}-${upper}` : null;
  }

  return normalizeCountToken(compact);
}

export function normalizeEmployeeRange(value: unknown, count?: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return parseRange(value) ?? fallbackCount(count);
  }

  return fallbackCount(count);
}

function readFirmographics(data: unknown): {
  category: Record<string, unknown>;
  metrics: Record<string, unknown>;
} | null {
  if (!isRecord(data) || !isRecord(data.data)) {
    return null;
  }

  return {
    category: isRecord(data.data.category) ? data.data.category : {},
    metrics: isRecord(data.data.metrics) ? data.data.metrics : {},
  };
}

function firstIndustry(category: Record<string, unknown>): string | null {
  return stringOrNull(category.industry)
    ?? stringOrNull(category.industryGroup)
    ?? stringOrNull(category.sector);
}

function failureResult(result: Extract<TregCallResult, { ok: false }>): TregFirmographicsResult {
  return {
    status: tregFailureStatus(result.reason),
    industry: null,
    employeeRange: null,
    callId: result.callId,
    costMicro: result.costMicro,
    reason: result.reason,
  };
}

function unexpectedPayloadResult(result: Extract<TregCallResult, { ok: true }>): TregFirmographicsResult {
  return {
    status: "unavailable",
    industry: null,
    employeeRange: null,
    callId: result.callId,
    costMicro: result.costMicro,
    reason: "unexpected_payload",
  };
}

export async function fetchTregFirmographics(
  domain: string,
  signal?: AbortSignal,
): Promise<TregFirmographicsResult> {
  const result = await callTreg({
    endpointId: ENDPOINT_ID,
    method: "GET",
    query: { domain },
    maxCostUsd: MAX_COST_USD,
    meta: { feature: "score", signal: "firmographics" },
    signal,
  });

  if (!result.ok) {
    return failureResult(result);
  }

  const payload = readFirmographics(result.data);
  if (!payload) {
    return unexpectedPayloadResult(result);
  }

  const industry = firstIndustry(payload.category);
  const employeeRange = normalizeEmployeeRange(payload.metrics.employees, payload.metrics.employeesCount);
  return {
    status: industry && employeeRange ? "ok" : "no_signal",
    industry,
    employeeRange,
    callId: result.callId,
    costMicro: result.costMicro,
    ...(industry && employeeRange ? {} : { reason: "missing_required_firmographics" }),
  };
}
