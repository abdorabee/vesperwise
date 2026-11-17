import { extractDomain } from "@/lib/chat-client";
import { daysSince } from "@/lib/time-ago";

const LEGACY_TITLE = /^\[Score result\s*[—–-]\s*.*?\(([^()\s]+)\)\]$/;

/** The domain a thread title stands for, including the legacy "[Score result — Name (domain)]" wrapper. */
export function domainOfTitle(title: string): string | null {
  const legacy = LEGACY_TITLE.exec(title.trim());
  return extractDomain(legacy ? legacy[1] : title);
}

/** Row label: legacy wrapped titles collapse to the plain domain. */
export function displayThreadTitle(title: string): string {
  const legacy = LEGACY_TITLE.exec(title.trim());
  return legacy ? domainOfTitle(title) ?? title : title;
}

export const STALE_SCORE_DAYS = 30;
export const NO_RECENT_SIGNALS = "No recent signals";

/** True when the last score is older than STALE_SCORE_DAYS. Unknown dates are not flagged. */
export function isStaleScore(iso: string | null | undefined, now = Date.now()): boolean {
  const days = daysSince(iso, now);
  return days !== null && days > STALE_SCORE_DAYS;
}

function newestFirst<T>(rows: T[], timeOf: (row: T) => string): T[] {
  return [...rows].sort((a, b) => (Date.parse(timeOf(b)) || 0) - (Date.parse(timeOf(a)) || 0));
}

function keepFirstPerKey<T>(rows: T[], keyOf: (row: T) => string | null): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = keyOf(row);
    if (key === null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** One row per domain, newest first. */
export function dedupeByDomain<T extends { domain: string; created_at: string }>(rows: T[], limit = Number.POSITIVE_INFINITY): T[] {
  return keepFirstPerKey(newestFirst(rows, (row) => row.created_at), (row) => row.domain.trim().toLowerCase()).slice(0, limit);
}

/** Threads titled with the same domain collapse to the newest; other titles are untouched. */
export function dedupeSessionsByDomain<T extends { title: string; updated_at: string }>(sessions: T[]): T[] {
  return keepFirstPerKey(newestFirst(sessions, (session) => session.updated_at), (session) => domainOfTitle(session.title));
}
