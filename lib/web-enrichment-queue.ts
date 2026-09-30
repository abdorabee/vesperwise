import { enqueueJob } from "@/lib/job-queue";
import type { SignalStatus } from "./types";

const QUEUE_NAME = "web-enrichment";

export const WEB_ENRICHMENT_SCHEMA_VERSION = "web-enrichment-v1";
export const WEB_ENRICHMENT_SIGNAL_KEYS = [
  "hiring",
  "news",
  "technology",
  "web_activity",
] as const;

export const WEB_ENRICHMENT_SUPPORTED_SIGNAL_KEYS = [
  "funding",
  ...WEB_ENRICHMENT_SIGNAL_KEYS,
] as const;

export type WebEnrichmentSignalKey = (typeof WEB_ENRICHMENT_SUPPORTED_SIGNAL_KEYS)[number];

export interface WebEnrichmentJob {
  domain: string;
  schemaVersion: typeof WEB_ENRICHMENT_SCHEMA_VERSION;
  requestedAt: string;
  signals: WebEnrichmentSignalKey[];
  shadow: boolean;
}

export function webEnrichmentSignalsForStatuses(
  statuses: Partial<Record<WebEnrichmentSignalKey, SignalStatus>>,
  fundingFallbackEnabled: boolean
): WebEnrichmentSignalKey[] {
  const fundingUnavailable =
    statuses.funding === "unavailable" ||
    statuses.funding === "not_found" ||
    statuses.funding === "stale";
  return fundingFallbackEnabled && fundingUnavailable
    ? [...WEB_ENRICHMENT_SIGNAL_KEYS, "funding"]
    : [...WEB_ENRICHMENT_SIGNAL_KEYS];
}

export function webEnrichmentDeduplicationId(domain: string): string {
  const canonicalDomain = domain.toLowerCase().trim();
  return `${WEB_ENRICHMENT_SCHEMA_VERSION}-${canonicalDomain.replace(/[^a-z0-9.-]/g, "-")}`;
}

/** Best-effort background enrichment. Missing queue infrastructure is non-fatal. */
export async function enqueueWebEnrichment(
  domain: string,
  signals: readonly WebEnrichmentSignalKey[] = WEB_ENRICHMENT_SIGNAL_KEYS
): Promise<boolean> {
  if (process.env.MOCK_SIGNALS === "true") return false;

  const requestedSignals = [...new Set(signals)]
    .filter((signal): signal is WebEnrichmentSignalKey =>
      WEB_ENRICHMENT_SUPPORTED_SIGNAL_KEYS.includes(signal)
    );
  if (requestedSignals.length === 0) return false;

  const canonicalDomain = domain.toLowerCase().trim();
  const payload: WebEnrichmentJob = {
    domain: canonicalDomain,
    schemaVersion: WEB_ENRICHMENT_SCHEMA_VERSION,
    requestedAt: new Date().toISOString(),
    signals: requestedSignals,
    shadow: process.env.WEB_ENRICHMENT_SHADOW_MODE !== "false",
  };

  return enqueueJob(
    QUEUE_NAME,
    webEnrichmentDeduplicationId(canonicalDomain),
    payload,
    { maxAttempts: 3 }
  );
}
