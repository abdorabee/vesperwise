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
  accountCount: number;
  weeklyDelta: number;
  avgScore: number;
  bandMix: ListBandMix;
  sparkline: number[];
  avatarInitials: string[];
  avatarClasses: string[];
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
  hottestList: { id: string; name: string; hotRatio: number; avgScore: number; hotThisWeek: number; total: number } | null;
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
    weeklyDelta: number;
    hotCount: number;
    hotWeeklyDelta: number;
    avgScore: number;
    avgScoreDelta: number;
    warmCount: number;
    rescoreWindowDays: number;
  };
  bandMix: ListBandMix;
  accounts: ListAccountRow[];
}

export const LIST_COLORS = [
  { value: "#dfff00", label: "Lime" },
  { value: "#e8ff40", label: "Lime hover" },
  { value: "#c8e600", label: "Lime active" },
  { value: "#fb7185", label: "Coral" },
  { value: "#fbbf24", label: "Amber" },
  { value: "#8a8f98", label: "Grey" },
  { value: "#ffffff", label: "White" },
] as const;

export const RULE_FIELDS = [
  { field: "score" as const, label: "Score" },
  { field: "score_band" as const, label: "Score band" },
  { field: "in_watchlist" as const, label: "In watchlist" },
  { field: "signal" as const, label: "Signal" },
];
