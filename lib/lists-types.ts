import type { ScoreBand, SignalSet } from "@/lib/types";

export type ListType = "manual" | "smart";

export type ListRule =
  | { field: "score"; op: ">=" | "<=" | "="; value: number }
  | { field: "score_band"; op: "is"; value: ScoreBand }
  | { field: "in_watchlist"; op: "is"; value: boolean }
  | {
      field: "signal";
      signal: "funding" | "hiring" | "news" | "technology" | "web";
      op: "active";
      minStrength?: number;
    };

export interface DbList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  list_type: ListType;
  color: string;
  icon_initials: string | null;
  rules: ListRule[] | null;
  auto_refresh: boolean;
  /** System lists (the synced watchlist) derive members live and cannot be deleted or hand-edited. */
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbListMember {
  id: string;
  list_id: string;
  user_id: string;
  domain: string;
  company_name: string;
  added_at: string;
}

/** One scoring event for an account, used for dated trends and real week-over-week deltas. */
export interface ScoreEvent {
  at: string;
  score: number;
}

export interface AccountContext {
  domain: string;
  company_name: string;
  score: number | null;
  score_band: ScoreBand | null;
  signals: SignalSet | null;
  inWatchlist: boolean;
  ai_summary: string | null;
  key_triggers: string[] | null;
  why_now: string | null;
  scoreHistory: number[];
  /** Chronological (oldest first) scoring events with timestamps. Absent means no dated history. */
  scoreEvents?: ScoreEvent[];
}

export interface ListBandMix {
  hot: number;
  warm: number;
  cold: number;
}

export interface ListCardSummary {
  id: string;
  name: string;
  description: string | null;
  list_type: ListType;
  color: string;
  icon_initials: string;
  isSystem: boolean;
  accountCount: number;
  /** Accounts added in the last 7 days; null when that cannot be derived (or none were added). */
  addedThisWeek: number | null;
  avgScore: number;
  bandMix: ListBandMix;
  /** Average list score per day (percent heights). Empty when fewer than two data points exist. */
  sparkline: number[];
  lastUpdated: string;
  lastUpdatedLabel: string;
  isRecentlyActive: boolean;
}

export interface ListsHeroStats {
  totalAccounts: number;
  listCount: number;
  overlapCount: number;
  recentlyUpdatedCount: number;
  bandMix: ListBandMix;
  /** List members with no score yet (not part of bandMix). */
  unscoredCount: number;
  /** Real number of HOT list members (not capped). */
  hotCount: number;
  /** Null when no list has a HOT account. `hotNow` is the current HOT count, not a weekly figure. */
  hottestList: { id: string; name: string; hotRatio: number; avgScore: number; hotNow: number; total: number } | null;
  /** Preview of the top HOT members only; use `hotCount` for the number. */
  firingAccounts: Array<{ domain: string; company_name: string; score: number; listName: string }>;
}

export interface ListAccountRow {
  domain: string;
  company_name: string;
  score: number | null;
  score_band: ScoreBand | null;
  sparkline: number[];
  qualifyReason: string;
  qualifySub: string;
  peopleCount: number;
  avatarClass: string;
  initial: string;
}

export interface ListDetailData {
  list: DbList;
  stats: {
    accountCount: number;
    addedThisWeek: number | null;
    hotCount: number;
    warmCount: number;
    avgScore: number;
    /** Week-over-week changes among accounts that already had a score a week ago; null without prior data. */
    hotDelta: number | null;
    warmDelta: number | null;
    avgScoreDelta: number | null;
  };
  bandMix: ListBandMix;
  accounts: ListAccountRow[];
}

/** Mirrors the API cap on domains accepted when creating a list. */
export const MAX_LIST_DOMAINS = 500;

export const LIST_COLORS = [
  { value: "#dfff00", label: "Lime" },
  { value: "#e8ff40", label: "Lime hover" },
  { value: "#c8e600", label: "Lime active" },
  { value: "#4ade80", label: "Green" },
  { value: "#f5b544", label: "Amber" },
  { value: "#8a8f98", label: "Grey" },
  { value: "#ffffff", label: "White" },
] as const;

export const RULE_FIELDS = [
  { field: "score" as const, label: "Score" },
  { field: "score_band" as const, label: "Score band" },
  { field: "in_watchlist" as const, label: "In watchlist" },
  { field: "signal" as const, label: "Signal" },
];
