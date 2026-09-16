import type { ScoreBand } from "@/lib/types";
import type {
  AccountContext,
  ListBandMix,
  ListCardSummary,
  ListDetailData,
  ListAccountRow,
  ListsHeroStats,
  DbList,
} from "@/lib/lists-types";
import { filterAccountsByRules } from "@/lib/lists-evaluator";

const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6", "av-7", "av-8", "av-9"];

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

export function buildSparkline(history: number[], buckets = 12): number[] {
  if (history.length === 0) return Array(buckets).fill(0);
  if (history.length <= buckets) {
    const pad = buckets - history.length;
    return [...Array(pad).fill(0), ...history];
  }
  const chunk = Math.ceil(history.length / buckets);
  const out: number[] = [];
  for (let i = 0; i < buckets; i++) {
    const slice = history.slice(i * chunk, (i + 1) * chunk);
    out.push(slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) : 0);
  }
  return out;
}

export function normalizeSparkline(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => Math.round((v / max) * 100));
}

export function weeklyDelta(current: number, prior: number): number {
  return current - prior;
}

export function listIconInitials(list: DbList): string {
  if (list.icon_initials?.trim()) return list.icon_initials.slice(0, 2).toUpperCase();
  return initialsFromName(list.name, 2);
}

export function buildListCardSummary(
  list: DbList,
  members: AccountContext[],
  priorWeekCount: number,
): ListCardSummary {
  const bandMix = computeBandMix(members);
  const avgScore = computeAvgScore(members);
  const sparkRaw = buildSparkline(members.flatMap((m) => m.scoreHistory.length ? m.scoreHistory : m.score != null ? [m.score] : []));
  const rel = formatRelativeTime(list.updated_at);
  const topMembers = [...members].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 4);

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    list_type: list.list_type,
    color: list.color,
    icon_initials: listIconInitials(list),
    accountCount: members.length,
    weeklyDelta: weeklyDelta(members.length, priorWeekCount),
    avgScore,
    bandMix,
    sparkline: normalizeSparkline(sparkRaw),
    avatarInitials: topMembers.map((m) => initialsFromName(m.company_name, 1)),
    avatarClasses: topMembers.map((m) => avatarClassFor(m.domain)),
    lastUpdated: list.updated_at,
    lastUpdatedLabel: rel.label,
    isRecentlyActive: rel.isRecent,
  };
}

export function buildHeroStats(
  summaries: ListCardSummary[],
  domainToLists: Map<string, string[]>,
  allAccounts: AccountContext[],
): ListsHeroStats {
  const bandMix = computeBandMix(allAccounts);
  const uniqueDomains = new Set<string>();
  for (const [domain, lists] of domainToLists) {
    if (lists.length > 0) uniqueDomains.add(domain);
  }

  let overlapCount = 0;
  for (const lists of domainToLists.values()) {
    if (lists.length > 1) overlapCount++;
  }

  const hourAgo = Date.now() - 3600000;
  const recentlyUpdatedCount = summaries.filter((s) => new Date(s.lastUpdated).getTime() > hourAgo).length;

  let hottest: ListsHeroStats["hottestList"] = null;
  for (const s of summaries) {
    if (s.accountCount === 0) continue;
    const hotRatio = s.bandMix.hot / s.accountCount;
    if (!hottest || hotRatio > hottest.hotRatio || (hotRatio === hottest.hotRatio && s.avgScore > hottest.avgScore)) {
      hottest = {
        id: s.id,
        name: s.name,
        hotRatio,
        avgScore: s.avgScore,
        hotThisWeek: s.bandMix.hot,
        total: s.accountCount,
      };
    }
  }

  const firingAccounts = [...allAccounts]
    .filter((a) => a.score_band === "HOT" && a.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)
    .map((a) => ({
      domain: a.domain,
      company_name: a.company_name,
      score: a.score ?? 0,
      listName: domainToLists.get(a.domain)?.[0] ?? "—",
    }));

  return {
    totalAccounts: uniqueDomains.size,
    listCount: summaries.length,
    overlapCount,
    recentlyUpdatedCount,
    bandMix,
    hottestList: hottest,
    firingAccounts,
  };
}

function qualifyText(account: AccountContext, list: DbList): { top: string; bot: string } {
  const top = account.why_now || account.ai_summary || "Matches list criteria";
  const rulesCount = list.rules?.length ?? 0;
  const delta =
    account.scoreHistory.length >= 2
      ? account.scoreHistory[account.scoreHistory.length - 1] - account.scoreHistory[0]
      : 0;
  const bot =
    list.list_type === "smart" && rulesCount > 0
      ? `${rulesCount} rule${rulesCount === 1 ? "" : "s"} matched${delta > 0 ? ` · +${delta} pts in 7d` : ""}`
      : account.key_triggers?.[0] ?? "Manual list member";
  return { top, bot };
}

export function buildListDetail(
  list: DbList,
  members: AccountContext[],
  priorWeekCount: number,
  priorHotCount: number,
  priorAvgScore: number,
  peopleByDomain: Map<string, number>,
): ListDetailData {
  const bandMix = computeBandMix(members);
  const avgScore = computeAvgScore(members);
  const hotCount = bandMix.hot;

  const accounts: ListAccountRow[] = members
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((m) => {
      const q = qualifyText(m, list);
      const spark = normalizeSparkline(buildSparkline(m.scoreHistory.length ? m.scoreHistory : m.score != null ? [m.score] : [], 7));
      return {
        domain: m.domain,
        company_name: m.company_name,
        score: m.score,
        score_band: m.score_band,
        sparkline: spark,
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
      weeklyDelta: weeklyDelta(members.length, priorWeekCount),
      hotCount,
      hotWeeklyDelta: weeklyDelta(hotCount, priorHotCount),
      avgScore,
      avgScoreDelta: Math.round((avgScore - priorAvgScore) * 10) / 10,
      warmCount: bandMix.warm,
      rescoreWindowDays: 14,
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

export function deltaLabel(delta: number, suffix = " this week"): string {
  if (delta > 0) return `▲ ${delta}${suffix}`;
  if (delta < 0) return `▼ ${Math.abs(delta)}${suffix}`;
  return `— flat`;
}
