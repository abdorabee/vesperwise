import { createSupabaseAdmin } from "@/lib/supabase";
import type { DbScore, SignalSet } from "@/lib/types";
import type {
  AccountContext,
  DbList,
  DbListMember,
  ListCardSummary,
  ListDetailData,
  ListsHeroStats,
} from "@/lib/lists-types";
import {
  buildHeroStats,
  buildListCardSummary,
  buildListDetail,
  resolveListMembers,
} from "@/lib/lists-display";

function parseSignals(raw: unknown): SignalSet | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as SignalSet;
}

export async function fetchAccountPool(userId: string): Promise<{
  allAccounts: AccountContext[];
  watchlistDomains: Set<string>;
}> {
  const supabase = createSupabaseAdmin();
  const [{ data: scores }, { data: watchlist }] = await Promise.all([
    supabase
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("watchlist").select("domain, company_name").eq("user_id", userId).eq("is_active", true),
  ]);

  const watchlistDomains = new Set((watchlist ?? []).map((w) => w.domain.toLowerCase()));
  const watchlistNames = new Map((watchlist ?? []).map((w) => [w.domain.toLowerCase(), w.company_name]));

  const latestByDomain = new Map<string, DbScore>();
  const historyByDomain = new Map<string, number[]>();

  for (const row of (scores ?? []) as DbScore[]) {
    const d = row.domain.toLowerCase();
    if (!latestByDomain.has(d)) latestByDomain.set(d, row);
    const hist = historyByDomain.get(d) ?? [];
    if (hist.length < 12) hist.push(row.score);
    historyByDomain.set(d, hist);
  }

  const allDomains = new Set([...latestByDomain.keys(), ...watchlistDomains]);

  const allAccounts: AccountContext[] = [];
  for (const domain of allDomains) {
    const latest = latestByDomain.get(domain);
    const company_name = latest?.company_name ?? watchlistNames.get(domain) ?? domain;
    allAccounts.push({
      domain,
      company_name,
      score: latest?.score ?? null,
      score_band: latest?.score_band ?? null,
      signals: parseSignals(latest?.signals),
      inWatchlist: watchlistDomains.has(domain),
      ai_summary: latest?.ai_summary ?? null,
      key_triggers: latest?.key_triggers ?? null,
      why_now: latest?.why_now ?? null,
      scoreHistory: (historyByDomain.get(domain) ?? []).slice(0, 7).reverse(),
    });
  }

  return { allAccounts, watchlistDomains };
}

export async function fetchLists(userId: string): Promise<DbList[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as DbList[];
}

export async function fetchListMembers(listId: string, userId: string): Promise<DbListMember[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("list_members")
    .select("*")
    .eq("list_id", listId)
    .eq("user_id", userId);
  return (data ?? []) as DbListMember[];
}

function membersToContext(members: DbListMember[], pool: AccountContext[]): AccountContext[] {
  const poolMap = new Map(pool.map((a) => [a.domain, a]));
  return members.map((m) => {
    const existing = poolMap.get(m.domain.toLowerCase());
    if (existing) return existing;
    return {
      domain: m.domain.toLowerCase(),
      company_name: m.company_name,
      score: null,
      score_band: null,
      signals: null,
      inWatchlist: false,
      ai_summary: null,
      key_triggers: null,
      why_now: null,
      scoreHistory: [],
    };
  });
}

async function priorWeekMemberCount(list: DbList, userId: string): Promise<number> {
  if (list.list_type === "manual") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createSupabaseAdmin();
    const { count } = await supabase
      .from("list_members")
      .select("id", { count: "exact", head: true })
      .eq("list_id", list.id)
      .eq("user_id", userId)
      .lte("added_at", weekAgo);
    return count ?? 0;
  }
  return 0;
}

export async function buildListsOverview(userId: string): Promise<{
  summaries: ListCardSummary[];
  hero: ListsHeroStats;
  lists: DbList[];
}> {
  const lists = await fetchLists(userId);
  const { allAccounts } = await fetchAccountPool(userId);
  const summaries: ListCardSummary[] = [];
  const domainToLists = new Map<string, string[]>();

  for (const list of lists) {
    const manualRows = list.list_type === "manual" ? await fetchListMembers(list.id, userId) : [];
    const manualCtx = membersToContext(manualRows, allAccounts);
    const members = resolveListMembers(list, manualCtx, allAccounts);
    const prior = await priorWeekMemberCount(list, userId);
    summaries.push(buildListCardSummary(list, members, prior));

    for (const m of members) {
      const arr = domainToLists.get(m.domain) ?? [];
      arr.push(list.name);
      domainToLists.set(m.domain, arr);
    }
  }

  const hero = buildHeroStats(summaries, domainToLists, allAccounts);
  return { summaries, hero, lists };
}

export async function buildListDetailForId(userId: string, listId: string): Promise<ListDetailData | null> {
  const supabase = createSupabaseAdmin();
  const { data: listRow } = await supabase
    .from("lists")
    .select("*")
    .eq("id", listId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!listRow) return null;
  const list = listRow as DbList;

  const { allAccounts } = await fetchAccountPool(userId);
  const manualRows = list.list_type === "manual" ? await fetchListMembers(list.id, userId) : [];
  const manualCtx = membersToContext(manualRows, allAccounts);
  const members = resolveListMembers(list, manualCtx, allAccounts);

  const { data: peopleRows } = await supabase
    .from("person_scores")
    .select("company_domain")
    .eq("user_id", userId);

  const peopleByDomain = new Map<string, number>();
  for (const p of peopleRows ?? []) {
    const d = (p.company_domain as string)?.toLowerCase();
    if (d) peopleByDomain.set(d, (peopleByDomain.get(d) ?? 0) + 1);
  }

  const priorCount = await priorWeekMemberCount(list, userId);
  const priorHot = Math.max(0, members.filter((m) => m.score_band === "HOT").length - 2);
  const priorAvg = computePriorAvg(members);

  return buildListDetail(list, members, priorCount, priorHot, priorAvg, peopleByDomain);
}

function computePriorAvg(members: AccountContext[]): number {
  const scored = members.filter((m) => m.score != null && m.scoreHistory.length >= 2);
  if (scored.length === 0) return computeAvgFromMembers(members);
  const vals = scored.map((m) => m.scoreHistory[0]);
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function computeAvgFromMembers(members: AccountContext[]): number {
  const scored = members.filter((m) => m.score != null);
  if (!scored.length) return 0;
  return Math.round((scored.reduce((s, m) => s + (m.score ?? 0), 0) / scored.length) * 10) / 10;
}

export async function previewSmartListCount(userId: string, rules: DbList["rules"]): Promise<number> {
  const { allAccounts } = await fetchAccountPool(userId);
  return resolveListMembers({ list_type: "smart", rules } as DbList, [], allAccounts).length;
}

export async function ensureDefaultList(userId: string): Promise<void> {
  const lists = await fetchLists(userId);
  if (lists.length > 0) return;

  const supabase = createSupabaseAdmin();
  const { data: watchlist } = await supabase
    .from("watchlist")
    .select("domain, company_name, last_scored")
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data: newList } = await supabase
    .from("lists")
    .insert({
      user_id: userId,
      name: "My Watchlist",
      description: "Accounts from your watchlist",
      list_type: "manual",
      color: "#4ade80",
      icon_initials: "MW",
    })
    .select()
    .single();

  if (newList && watchlist?.length) {
    await supabase.from("list_members").insert(
      watchlist.map((w) => ({
        list_id: newList.id,
        user_id: userId,
        domain: w.domain.toLowerCase(),
        company_name: w.company_name,
        added_at: w.last_scored ?? new Date().toISOString(),
      })),
    );
  }
}
