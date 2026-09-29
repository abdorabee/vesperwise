const MINUTE = 60_000;
const DAY = 86_400_000;

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

/** Whole days between an ISO timestamp and now (never negative). */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  const ms = toMs(iso);
  if (ms === null) return null;
  return Math.max(0, Math.floor((now - ms) / DAY));
}

/** Evidence age: "today", "42 d ago", "2 y ago". */
export function formatDaysAgo(days: number | null | undefined): string | null {
  if (days == null || !Number.isFinite(days)) return null;
  const whole = Math.max(0, Math.floor(days));
  if (whole === 0) return "today";
  if (whole >= 365) return `${Math.floor(whole / 365)} y ago`;
  return `${whole} d ago`;
}

/** Recency of an event: "just now", "4 min ago", "3 h ago", "2 d ago". */
export function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string | null {
  const ms = toMs(iso);
  if (ms === null) return null;
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return "just now";
  const mins = Math.floor(diff / MINUTE);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDaysAgo(Math.floor(diff / DAY));
}

/** Absolute date for tooltips, e.g. "27 Sep 2026". */
export function formatAbsoluteDate(iso: string | null | undefined): string | null {
  const ms = toMs(iso);
  if (ms === null) return null;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
