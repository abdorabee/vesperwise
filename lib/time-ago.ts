const MINUTE = 60_000;
const DAY = 86_400_000;

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const HOUR = 60 * MINUTE;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const INVALID_LABEL = "—";

function toTimestamp(value: Date | string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * The one relative-time style used across the app:
 * "just now", "5m ago", "3h ago", "2d ago", "3w ago", "4mo ago", "2y ago".
 * Invalid input returns an em dash. Future timestamps clamp to "just now".
 */
export function formatRelativeTime(
  date: Date | string | number | null | undefined,
  now: Date | number = new Date(),
): string {
  const ms = toTimestamp(date);
  const nowMs = toTimestamp(now);
  if (ms === null || nowMs === null) return INVALID_LABEL;
  const diff = Math.max(0, nowMs - ms);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const days = Math.floor(diff / DAY);
  if (days < DAYS_PER_WEEK) return `${days}d ago`;
  if (days < DAYS_PER_MONTH) return `${Math.floor(days / DAYS_PER_WEEK)}w ago`;
  if (days < DAYS_PER_YEAR) return `${Math.floor(days / DAYS_PER_MONTH)}mo ago`;
  return `${Math.floor(days / DAYS_PER_YEAR)}y ago`;
}

/** Age of an ISO timestamp: "today" within a day, otherwise the shared relative style. a dash when missing. */
export function timeAgo(iso: string | null | undefined, now: Date | number = new Date()): string {
  const ms = toMs(iso);
  if (ms === null) return INVALID_LABEL;
  const nowMs = toTimestamp(now) ?? Date.now();
  if (Math.max(0, nowMs - ms) < DAY) return "today";
  return formatRelativeTime(ms, nowMs);
}

/** Whole days between an ISO timestamp and now (never negative). */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  const ms = toMs(iso);
  if (ms === null) return null;
  return Math.max(0, Math.floor((now - ms) / DAY));
}

/** Evidence age: "today", "42d ago", "2y ago". Null when unknown. */
export function formatDaysAgo(days: number | null | undefined): string | null {
  if (days == null || !Number.isFinite(days)) return null;
  const whole = Math.max(0, Math.floor(days));
  if (whole === 0) return "today";
  return formatRelativeTime(whole * DAY, 2 * whole * DAY);
}

/** Absolute date for tooltips, e.g. "27 Sep 2026". */
export function formatAbsoluteDate(iso: string | null | undefined): string | null {
  const ms = toMs(iso);
  if (ms === null) return null;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
