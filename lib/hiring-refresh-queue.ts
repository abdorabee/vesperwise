import { enqueueJob } from "@/lib/job-queue";

const QUEUE_NAME = "hiring-refresh";

export const HIRING_EVIDENCE_SCHEMA_VERSION = "hiring-v2";

export interface HiringRefreshJob {
  domain: string;
  schemaVersion: typeof HIRING_EVIDENCE_SCHEMA_VERSION;
  requestedAt: string;
  shadow: boolean;
}

export function hiringRefreshDeduplicationId(domain: string): string {
  const canonicalDomain = domain.toLowerCase().trim();
  return `${HIRING_EVIDENCE_SCHEMA_VERSION}-${canonicalDomain.replace(/[^a-z0-9.-]/g, "-")}`;
}

/**
 * Enqueue a best-effort background refresh. Missing queue infrastructure must
 * never make a user-facing score request fail.
 */
export async function enqueueHiringRefresh(domain: string): Promise<boolean> {
  const canonicalDomain = domain.toLowerCase().trim();
  const payload: HiringRefreshJob = {
    domain: canonicalDomain,
    schemaVersion: HIRING_EVIDENCE_SCHEMA_VERSION,
    requestedAt: new Date().toISOString(),
    shadow: process.env.SCRAPLING_SHADOW_MODE !== "false",
  };

  return enqueueJob(
    QUEUE_NAME,
    hiringRefreshDeduplicationId(canonicalDomain),
    payload,
    { maxAttempts: 3 }
  );
}
