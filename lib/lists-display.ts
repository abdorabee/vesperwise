import type { ScoreBand } from "@/lib/types";
import type {
  AccountContext,
  ListBandMix,
  ListCardSummary,
  ListDetailData,
  ListAccountRow,
  ListsHeroStats,
  DbList,
  ScoreEvent,
} from "@/lib/lists-types";
import { filterAccountsByRules } from "@/lib/lists-evaluator";
import { bandForScore } from "@/lib/score-band";

const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6", "av-7", "av-8", "av-9"];
const MIN_TREND_POINTS = 2;
const LIST_TREND_POINTS = 12;
const MEMBER_TREND_POINTS = 7;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FIRING_PREVIEW_LIMIT = 3;

export function initialsFromName(name: string, max = 2): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, max).toUpperCase();
}

export function avatarClassFor(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) hash = (hash + domain.charCodeAt(i) * (i + 1)) % AV_CLASSES.length;
  return AV_CLASSES[hash] ?? "av-1";
}

export function formatRelativeTime(iso: string): { label: string; isRecent: boolean } {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return { label: "just now", isRecent: true };
  if (mins < 60) return { label: `${mins}m ago`, isRecent: mins < 60 };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs}h ago`, isRecent: hrs < 2 };
  const days = Math.floor(hrs / 24);
  return { label: `${days}d ago`, isRecent: false };
}

/** "1 list", "2 lists". Returns the count together with the correctly inflected word. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function computeBandMix(accounts: AccountContext[]): ListBandMix {
  const mix = { hot: 0, warm: 0, cold: 0 };
  for (const a of accounts) {
    if (a.score_band === "HOT") mix.hot++;
    else if (a.score_band === "WARM") mix.warm++;
    else if (a.score_band === "COLD") mix.cold++;
  }
  return mix;
}

export function computeAvgScore(accounts: AccountContext[]): number {
  const scored = accounts.filter((a) => a.score != null);
  if (scored.length === 0) return 0;
  return Math.round((scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length) * 10) / 10;
}

function eventsOf(account: AccountContext): ScoreEvent[] {
  return account.scoreEvents ?? [];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * The list's average score per day, in date order. Each member counts from its first scoring day,
 * using its latest score as of that day. Returns [] below two points so the UI hides the sparkline.
 */
export function buildListTrend(members: AccountContext[], maxPoints = LIST_TREND_POINTS): number[] {
  const days = [...new Set(members.flatMap((m) => eventsOf(m).map((e) => dayKey(e.at))))].sort();
  const series = days.map((day) => {
    const asOf: number[] = [];
    for (const m of members) {
      const upTo = eventsOf(m).filter((e) => dayKey(e.at) <= day);
      const latest = upTo[upTo.length - 1];
      if (latest) asOf.push(latest.score);
    }
    return Math.round(asOf.reduce((a, b) => a + b, 0) / asOf.length);
  });
  const tail = series.slice(-maxPoints);
  return tail.length >= MIN_TREND_POINTS ? tail : [];
}

/** One account's own score trend, oldest first. [] below two scoring events. */
export function buildMemberTrend(events: ScoreEvent[], maxPoints = MEMBER_TREND_POINTS): number[] {
  const values = events.slice(-maxPoints).map((e) => e.score);
  return values.length >= MIN_TREND_POINTS ? values : [];
}

export interface WeekDeltas {
  hot: number | null;
  warm: number | null;
  avg: number | null;
}

function scoreAsOf(events: ScoreEvent[], cutoffMs: number): number | null {
  let found: number | null = null;
  for (const e of events) {
    if (new Date(e.at).getTime() <= cutoffMs) found = e.score;
  }
  return found;
}

/**
 * Week-over-week change among accounts that already had a score a week ago. With no such account
 * there is no prior data, so every delta is null rather than an invented number.
 */
export function computeWeekDeltas(members: AccountContext[], now = Date.now()): WeekDeltas {
  const cutoff = now - WEEK_MS;
  const cohort: Array<{ then: number; current: number }> = [];
  for (const m of members) {
    const events = eventsOf(m);
    const then = scoreAsOf(events, cutoff);
    const current = events.at(-1)?.score ?? m.score;
    if (then != null && current != null) cohort.push({ then, current });
  }
  if (cohort.length === 0) return { hot: null, warm: null, avg: null };

  const count = (scores: number[], band: ScoreBand) => scores.filter((v) => bandForScore(v) === band).length;
  const mean = (scores: number[]) => scores.reduce((a, b) => a + b, 0) / scores.length;
  const before = cohort.map((c) => c.then);
  const after = cohort.map((c) => c.current);
  return {
    hot: count(after, "HOT") - count(before, "HOT"),
    warm: count(after, "WARM") - count(before, "WARM"),
    avg: Math.round((mean(after) - mean(before)) * 10) / 10,
  };
}

export function listIconInitials(list: DbList): string {
  if (list.icon_initials?.trim()) return list.icon_initials.slice(0, 2).toUpperCase();
  return initialsFromName(list.name, 2);
}

function positiveOrNull(n: number | null): number | null {
  return n != null && n > 0 ? n : null;
}

export function buildListCardSummary(
  list: DbList,
  members: AccountContext[],
  addedThisWeek: number | null,
): ListCardSummary {
  const rel = formatRelativeTime(list.updated_at);
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    list_type: list.list_type,
    color: list.color,
    icon_initials: listIconInitials(list),
    isSystem: Boolean(list.is_system),
    accountCount: members.length,
    addedThisWeek: positiveOrNull(addedThisWeek),
    avgScore: computeAvgScore(members),
    bandMix: computeBandMix(members),
    sparkline: buildListTrend(members),
    lastUpdated: list.updated_at,
    lastUpdatedLabel: `Edited ${rel.label}`,
    isRecentlyActive: rel.isRecent,
  };
}

function pickHottestList(summaries: ListCardSummary[]): ListsHeroStats["hottestList"] {
  let hottest: ListsHeroStats["hottestList"] = null;
  for (const s of summaries) {
    if (s.accountCount === 0 || s.bandMix.hot === 0) continue;
    const hotRatio = s.bandMix.hot / s.accountCount;
    const beats =
      !hottest || hotRatio > hottest.hotRatio || (hotRatio === hottest.hotRatio && s.avgScore > hottest.avgScore);
    if (beats) {
      hottest = { id: s.id, name: s.name, hotRatio, avgScore: s.avgScore, hotNow: s.bandMix.hot, total: s.accountCount };
    }
  }
  return hottest;
}

/**
 * Hero numbers for the Lists page. Every figure is computed from list members only: accounts that
 * are in no list are ignored even when present in `accounts`.
 */
export function buildHeroStats(
  summaries: ListCardSummary[],
  domainToLists: Map<string, string[]>,
  accounts: AccountContext[],
): ListsHeroStats {
  const members = new Map<string, AccountContext>();
  for (const a of accounts) {
    if ((domainToLists.get(a.domain)?.length ?? 0) > 0) members.set(a.domain, a);
  }
  const memberList = [...members.values()];
  const hot = memberList
    .filter((a) => a.score_band === "HOT" && a.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  let overlapCount = 0;
  for (const lists of domainToLists.values()) {
    if (lists.length > 1) overlapCount++;
  }

  const hourAgo = Date.now() - 3600000;
  return {
    totalAccounts: members.size,
    listCount: summaries.length,
    overlapCount,
    recentlyUpdatedCount: summaries.filter((s) => new Date(s.lastUpdated).getTime() > hourAgo).length,
    bandMix: computeBandMix(memberList),
    unscoredCount: memberList.filter((a) => a.score_band == null).length,
    hotCount: hot.length,
    hottestList: pickHottestList(summaries),
    firingAccounts: hot.slice(0, FIRING_PREVIEW_LIMIT).map((a) => ({
      domain: a.domain,
      company_name: a.company_name,
      score: a.score ?? 0,
      listName: domainToLists.get(a.domain)?.[0] ?? "—",
    })),
  };
}

function pointsChangeThisWeek(account: AccountContext, now: number): number {
  const recent = eventsOf(account).filter((e) => new Date(e.at).getTime() > now - WEEK_MS);
  if (recent.length < 2) return 0;
  return recent[recent.length - 1].score - recent[0].score;
}

function qualifyText(account: AccountContext, list: DbList, now: number): { top: string; bot: string } {
  const top = account.why_now || account.ai_summary || "Matches list criteria";
  const rulesCount = list.rules?.length ?? 0;
  const delta = pointsChangeThisWeek(account, now);
  const bot =
    list.list_type === "smart" && rulesCount > 0
      ? `${pluralize(rulesCount, "rule")} matched${delta > 0 ? ` · +${delta} pts in 7d` : ""}`
      : account.key_triggers?.[0] ?? (list.is_system ? "On your watchlist" : "Manual list member");
  return { top, bot };
}

export function buildListDetail(
  list: DbList,
  members: AccountContext[],
  addedThisWeek: number | null,
  peopleByDomain: Map<string, number>,
  now = Date.now(),
): ListDetailData {
  const bandMix = computeBandMix(members);
  const deltas = computeWeekDeltas(members, now);

  const accounts: ListAccountRow[] = [...members]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((m) => {
      const q = qualifyText(m, list, now);
      return {
        domain: m.domain,
        company_name: m.company_name,
        score: m.score,
        score_band: m.score_band,
        sparkline: buildMemberTrend(eventsOf(m)),
        qualifyReason: q.top,
        qualifySub: q.bot,
        peopleCount: peopleByDomain.get(m.domain) ?? 0,
        avatarClass: avatarClassFor(m.domain),
        initial: initialsFromName(m.company_name, 1),
      };
    });

  return {
    list,
    stats: {
      accountCount: members.length,
      addedThisWeek: positiveOrNull(addedThisWeek),
      hotCount: bandMix.hot,
      warmCount: bandMix.warm,
      avgScore: computeAvgScore(members),
      hotDelta: deltas.hot,
      warmDelta: deltas.warm,
      avgScoreDelta: deltas.avg,
    },
    bandMix,
    accounts,
  };
}

export function resolveListMembers(
  list: DbList,
  manualMembers: AccountContext[],
  allAccounts: AccountContext[],
): AccountContext[] {
  if (list.list_type === "manual") return manualMembers;
  return filterAccountsByRules(allAccounts, list.rules);
}

export function stripeColorForBand(band: ScoreBand | null, fallback: string): string {
  if (band === "HOT") return "var(--hot)";
  if (band === "WARM") return "var(--warm)";
  if (band === "COLD") return "var(--cold)";
  return fallback;
}

/** "▲ 3 this week" / "▼ 2 this week"; null for no change or no data, so no delta is rendered. */
export function deltaLabel(delta: number | null, suffix = " this week"): string | null {
  if (delta == null || delta === 0) return null;
  return delta > 0 ? `▲ ${delta}${suffix}` : `▼ ${Math.abs(delta)}${suffix}`;
}
