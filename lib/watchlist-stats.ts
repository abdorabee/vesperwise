import { createSupabaseAdmin } from "@/lib/supabase";
import { fetchLists, fetchListMembers } from "@/lib/lists-data";
import type { DbList } from "@/lib/lists-types";
import type { ScoreBand, SignalSet, WatchlistEntry } from "@/lib/types";

export type WatchlistRange = "24H" | "7D" | "30D" | "90D";

export interface SignalMixSegment {
  key: string;
  label: string;
  heightPct: number;
  color: string;
  /** Null when the account has no stored signals yet. */
  score: number | null;
  max: number | null;
}

export interface WatchlistEnrichedEntry extends WatchlistEntry {
  sparkline: number[];
  scoreHistory: { created_at: string; score: number }[];
  signals: SignalSet | null;
  delta: number | null;
  thresholdLabel: string;
  thresholdHit: boolean;
  lastMoveLabel: string;
  lastMoveColor: string;
  signalMix: SignalMixSegment[];
}

export interface WatchlistListTab {
  id: string;
  name: string;
  color: string;
  count: number;
  domains: string[];
}

export interface WatchlistAlertItem {
  company_name: string;
  domain: string;
  delta: number;
  score: number;
}

export interface WatchlistStats {
  entries: WatchlistEnrichedEntry[];
  lists: WatchlistListTab[];
  stats: {
    total: number;
    hotCrossedToday: number;
    lastRefreshAt: string | null;
  };
  alertItems: WatchlistAlertItem[];
}

// Categorical slots 1-5 of the validated data-viz palette (light and dark
// steps live in app/globals.css as --viz-mix-*). Funding and technology used
// to be two near-identical limes (normal-vision dE 2.3).
const MIX_COLORS: Record<string, string> = {
  funding: "var(--viz-mix-funding)",
  hiring: "var(--viz-mix-hiring)",
  news: "var(--viz-mix-news)",
  technology: "var(--viz-mix-technology)",
  web: "var(--viz-mix-web)",
};

const MIX_LABELS: Record<string, string> = {
  funding: "Funding",
  hiring: "Hiring",
  news: "News",
  technology: "Tech",
  web: "Web",
};

export const SIGNAL_MIX_LEGEND = (["funding", "hiring", "news", "technology", "web"] as const).map((key) => ({
  key,
  label: MIX_LABELS[key],
  color: MIX_COLORS[key],
}));

function parseSignals(raw: unknown): SignalSet | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as SignalSet;
}

function avIndex(name: string): number {
  return ((name.charCodeAt(0) ?? 0) % 10) + 1;
}

export function getAvatarClass(name: string): string {
  return `av av-${avIndex(name)}`;
}

export function getAvatarInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function bandColor(band: ScoreBand | null): string {
  if (band === "HOT") return "var(--band-hot)";
  if (band === "WARM") return "var(--band-warm)";
  return "var(--band-cold)";
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function buildThresholdLabel(score: number | null, band: ScoreBand | null, previous: number | null): {
  label: string;
  hit: boolean;
} {
  if (score == null) return { label: "Not scored", hit: false };
  const crossedHot = previous != null && previous < 75 && score >= 75;
  if (crossedHot) return { label: "▲ Crossed HOT 75", hit: true };
  if (band === "HOT") return { label: "HOT band · stable", hit: false };
  if (band === "WARM") {
    const toHot = Math.max(0, 75 - score);
    return { label: `WARM · ${toHot} to HOT`, hit: false };
  }
  const toHot = Math.max(0, 75 - score);
  return { label: `COLD · ${toHot} to HOT`, hit: false };
}

function buildLastMoveLabel(delta: number | null, lastScored: string | null): {
  label: string;
  color: string;
} {
  const rel = formatRelativeTime(lastScored);
  if (delta == null || delta === 0) {
    return { label: `— 0 · ${rel}`, color: "var(--text-tertiary)" };
  }
  if (delta > 0) {
    return { label: `▲ ${delta} · ${rel}`, color: "var(--hot)" };
  }
  return { label: `▼ ${Math.abs(delta)} · ${rel}`, color: "var(--red)" };
}

function buildSignalMix(signals: SignalSet | null): SignalMixSegment[] {
  const keys = ["funding", "hiring", "news", "technology", "web"] as const;
  if (!signals) {
    return keys.map((key) => ({ key, label: MIX_LABELS[key], heightPct: 20, color: MIX_COLORS[key], score: null, max: null }));
  }
  return keys.map((key) => {
    const sig = signals[key];
    const ratio = sig?.max ? sig.score / sig.max : 0;
    return {
      key,
      label: MIX_LABELS[key],
      heightPct: Math.max(12, Math.round(ratio * 100)),
      color: MIX_COLORS[key],
      score: sig ? sig.score : null,
      max: sig ? sig.max : null,
    };
  });
}

function buildSparkline(history: number[], targetLen = 8): number[] {
  if (history.length === 0) return Array(targetLen).fill(0);
  const slice = history.slice(-targetLen);
  while (slice.length < targetLen) slice.unshift(slice[0] ?? 0);
  return slice;
}

function rangeMs(range: WatchlistRange): number {
  switch (range) {
    case "24H":
      return 24 * 60 * 60 * 1000;
    case "7D":
      return 7 * 24 * 60 * 60 * 1000;
    case "30D":
      return 30 * 24 * 60 * 60 * 1000;
    case "90D":
      return 90 * 24 * 60 * 60 * 1000;
  }
}

export function sparklineForRange(history: { created_at: string; score: number }[], range: WatchlistRange): number[] {
  const since = Date.now() - rangeMs(range);
  const filtered = history
    .filter((h) => new Date(h.created_at).getTime() >= since)
    .map((h) => h.score)
    .reverse();
  return buildSparkline(filtered.length ? filtered : history.slice(0, 8).map((h) => h.score).reverse());
}

export async function buildWatchlistStats(userId: string): Promise<WatchlistStats> {
  const supabase = createSupabaseAdmin();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const [{ data: watchlistRows }, { data: scoreRows }, lists] = await Promise.all([
    supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("score", { ascending: false, nullsFirst: false }),
    supabase
      .from("scores")
      .select("domain, score, signals, created_at")
      .eq("user_id", userId)
      .gte("created_at", ninetyDaysAgo)
      .order("created_at", { ascending: false }),
    fetchLists(userId),
  ]);

  const historyByDomain = new Map<string, { created_at: string; score: number }[]>();
  const latestSignals = new Map<string, SignalSet | null>();

  for (const row of scoreRows ?? []) {
    const d = row.domain.toLowerCase();
    if (!latestSignals.has(d)) latestSignals.set(d, parseSignals(row.signals));
    const hist = historyByDomain.get(d) ?? [];
    if (hist.length < 24) {
      hist.push({ created_at: row.created_at, score: row.score });
      historyByDomain.set(d, hist);
    }
  }

  const listTabs: WatchlistListTab[] = await Promise.all(
    lists.map(async (list: DbList) => {
      const members = list.list_type === "manual" ? await fetchListMembers(list.id, userId) : [];
      const domains = members.map((m) => m.domain.toLowerCase());
      const watchDomains = new Set((watchlistRows ?? []).map((w) => w.domain.toLowerCase()));
      const count = domains.filter((d) => watchDomains.has(d)).length;
      return {
        id: list.id,
        name: list.name,
        color: list.color,
        count,
        domains,
      };
    }),
  );

  const entries: WatchlistEnrichedEntry[] = (watchlistRows ?? []).map((row) => {
    const w = row as WatchlistEntry;
    const domain = w.domain.toLowerCase();
    const history = historyByDomain.get(domain) ?? [];
    const signals = latestSignals.get(domain) ?? null;
    const delta =
      w.score != null && w.previous_score != null ? w.score - w.previous_score : null;
    const { label: thresholdLabel, hit: thresholdHit } = buildThresholdLabel(
      w.score,
      w.score_band,
      w.previous_score,
    );
    const { label: lastMoveLabel, color: lastMoveColor } = buildLastMoveLabel(delta, w.last_scored);

    return {
      ...w,
      scoreHistory: history,
      sparkline: sparklineForRange(history, "7D"),
      signals,
      delta,
      thresholdLabel,
      thresholdHit,
      lastMoveLabel,
      lastMoveColor,
      signalMix: buildSignalMix(signals),
    };
  });

  const alertItems: WatchlistAlertItem[] = entries
    .filter((e) => {
      if (e.score == null || e.score < 75) return false;
      const crossed = e.previous_score != null && e.previous_score < 75;
      const recent =
        e.last_scored && new Date(e.last_scored).getTime() >= new Date(sixHoursAgo).getTime();
      return crossed && recent;
    })
    .slice(0, 5)
    .map((e) => ({
      company_name: e.company_name,
      domain: e.domain,
      delta: e.delta ?? 0,
      score: e.score,
    }));

  const lastRefreshAt =
    entries.reduce<string | null>((latest, e) => {
      if (!e.last_scored) return latest;
      if (!latest || e.last_scored > latest) return e.last_scored;
      return latest;
    }, null) ?? null;

  const hotCrossedToday = entries.filter((e) => {
    if (e.score == null || e.score < 75 || e.previous_score == null || e.previous_score >= 75) {
      return false;
    }
    if (!e.last_scored) return false;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    return new Date(e.last_scored) >= dayStart;
  }).length;

  const allTab: WatchlistListTab = {
    id: "all",
    name: "All",
    color: "",
    count: entries.length,
    domains: entries.map((e) => e.domain.toLowerCase()),
  };

  return {
    entries,
    lists: [allTab, ...listTabs],
    stats: {
      total: entries.length,
      hotCrossedToday,
      lastRefreshAt,
    },
    alertItems,
  };
}

export { bandColor, formatRelativeTime };
