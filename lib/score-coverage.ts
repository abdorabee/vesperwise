import type { SignalStatus } from "@/lib/types";

const COVERAGE_SIGNALS = [
  ["funding", "Funding"],
  ["hiring", "Hiring"],
  ["news", "News"],
  ["technology", "Technology"],
  ["web_activity", "Web activity"],
] as const;

type CoverageSignalKey = (typeof COVERAGE_SIGNALS)[number][0];
export type CoverageSignalState = "verified" | "checked" | "stale" | "not_found" | "unavailable";

export interface CoverageSignalView {
  key: CoverageSignalKey;
  label: string;
  state: CoverageSignalState;
  statusLabel: string;
  currentRead: string;
  detail: string;
  source?: string;
}

export interface IncompleteCoverageResult {
  company: string;
  domain: string;
  coveragePercent: number;
  signals: CoverageSignalView[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSignalStatus(value: unknown): value is SignalStatus {
  return ["ok", "no_signal", "stale", "not_found", "unavailable"].includes(String(value));
}

function signalState(status: SignalStatus): Pick<CoverageSignalView, "state" | "statusLabel"> {
  if (status === "ok") return { state: "verified", statusLabel: "Evidence found" };
  if (status === "no_signal") return { state: "checked", statusLabel: "Checked" };
  if (status === "stale") return { state: "stale", statusLabel: "Stale" };
  if (status === "not_found") return { state: "not_found", statusLabel: "Not found" };
  return { state: "unavailable", statusLabel: "Unavailable" };
}

function titleCaseSource(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseIncompleteCoverage(payload: unknown): IncompleteCoverageResult | null {
  if (!isRecord(payload) || payload.code !== "unscorable_domain") return null;
  if (typeof payload.domain !== "string" || !payload.domain.trim()) return null;
  if (typeof payload.data_coverage !== "number" || !Number.isFinite(payload.data_coverage)) return null;
  if (!isRecord(payload.source_status) || !isRecord(payload.signals)) return null;
  const sourceStatus = payload.source_status;
  const signalPayload = payload.signals;

  const signals = COVERAGE_SIGNALS.map(([key, label]): CoverageSignalView => {
    const signal = isRecord(signalPayload[key]) ? signalPayload[key] : {};
    const rawStatus = sourceStatus[key];
    const status: SignalStatus = isSignalStatus(rawStatus) ? rawStatus : "unavailable";
    const score = typeof signal.score === "number" && Number.isFinite(signal.score) ? signal.score : 0;
    const max = typeof signal.max === "number" && Number.isFinite(signal.max) ? signal.max : null;
    const unavailable = status === "unavailable" || status === "not_found";
    const detail = typeof signal.detail === "string" && signal.detail.trim()
      ? signal.detail.trim()
      : unavailable ? "No reliable source evidence was returned." : "Source checked successfully.";
    const source = typeof signal.source === "string" && signal.source.trim()
      ? titleCaseSource(signal.source.trim())
      : undefined;

    return {
      key,
      label,
      ...signalState(status),
      currentRead: unavailable || max === null ? "Unavailable" : `${score} / ${max}`,
      detail,
      ...(source ? { source } : {}),
    };
  });

  return {
    company: typeof payload.company === "string" && payload.company.trim()
      ? payload.company.trim()
      : payload.domain.trim(),
    domain: payload.domain.trim(),
    coveragePercent: Math.max(0, Math.min(100, Math.round(payload.data_coverage * 100))),
    signals,
  };
}
