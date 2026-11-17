const STORAGE_KEY = "vw.watchlist.dismissedAlerts";
const MAX_STORED = 200;

/** Alert id = domain + score, so a later, different crossing alerts again. */
export function alertId(item: { domain: string; score: number }): string {
  return `${item.domain.toLowerCase()}:${item.score}`;
}

export function readDismissedAlerts(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeDismissedAlerts(ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-MAX_STORED)));
  } catch {
    // Storage unavailable (private mode / blocked): dismissal lasts for this session only.
  }
}
