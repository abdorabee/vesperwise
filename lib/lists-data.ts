import { createSupabaseAdmin } from "@/lib/supabase";
import type { DbScore, SignalSet } from "@/lib/types";
import type {
  AccountContext,
  DbList,
  DbListMember,
  ListCardSummary,
  ListDetailData,
  ListsHeroStats,
  ScoreEvent,
} from "@/lib/lists-types";
import {
  buildHeroStats,
  buildListCardSummary,
  buildListDetail,
  resolveListMembers,
} from "@/lib/lists-display";

const SCORE_POOL_LIMIT = 5000;
const EVENTS_PER_DOMAIN = 30;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const UNIQUE_VIOLATION = "23505";
export const SYSTEM_LIST_NAME = "My Watchlist";
const SCORE_COLUMNS =
  "domain, company_name, score, score_band, signals, ai_summary, key_triggers, why_now, created_at";

export interface WatchlistRow {
  domain: string;
  company_name: string;
  last_scored: string | null;
}

type ScoreRow = Pick<
  DbScore,
  "domain" | "company_name" | "score" | "score_band" | "signals" | "ai_summary" | "key_triggers" | "why_now" | "created_at"
>;

function parseSignals(raw: unknown): SignalSet | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as SignalSet;
}

function groupEvents(rows: ScoreRow[]): { latest: Map<string, ScoreRow>; events: Map<string, ScoreEvent[]> } {
  const latest = new Map<string, ScoreRow>();
  const events = new Map<string, ScoreEvent[]>();
  for (const row of rows) {
    const d = row.domain.toLowerCase();
    if (!latest.has(d)) latest.set(d, row);
    const list = events.get(d) ?? [];
    if (list.length < EVENTS_PER_DOMAIN) list.push({ at: row.created_at, score: row.score });
    events.set(d, list);
  }
  for (const [d, list] of events) events.set(d, [...list].reverse());
  return { latest, events };
}

export async function fetchAccountPool(userId: string): Promise<{
  allAccounts: AccountContext[];
  watchlistDomains: Set<string>;
  watchlistRows: WatchlistRow[];
}> {
  const supabase = createSupabaseAdmin();
  const [{ data: scores }, { data: watchlist }] = await Promise.all([
    supabase
      .from("scores")
      .select(SCORE_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(SCORE_POOL_LIMIT),
    supabase
      .from("watchlist")
      .select("domain, company_name, last_scored")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  const watchlistRows = ((watchlist ?? []) as WatchlistRow[]).map((w) => ({ ...w, domain: w.domain.toLowerCase() }));
  const watchlistDomains = new Set(watchlistRows.map((w) => w.domain));
  const watchlistNames = new Map(watchlistRows.map((w) => [w.domain, w.company_name]));
  const { latest, events } = groupEvents((scores ?? []) as ScoreRow[]);

  const allAccounts: AccountContext[] = [];
  for (const domain of new Set([...latest.keys(), ...watchlistDomains])) {
    const row = latest.get(domain);
    const scoreEvents = events.get(domain) ?? [];
    allAccounts.push({
      domain,
      company_name: row?.company_name ?? watchlistNames.get(domain) ?? domain,
      score: row?.score ?? null,
      score_band: row?.score_band ?? null,
      signals: parseSignals(row?.signals),
      inWatchlist: watchlistDomains.has(domain),
      ai_summary: row?.ai_summary ?? null,
      key_triggers: row?.key_triggers ?? null,
      why_now: row?.why_now ?? null,
      scoreHistory: scoreEvents.slice(-7).map((e) => e.score),
      scoreEvents,
    });
  }

  return { allAccounts, watchlistDomains, watchlistRows };
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

/** Members of the synced watchlist list: always the live active watchlist, never copied rows. */
export function systemMembersFromWatchlist(rows: WatchlistRow[], listId: string, userId: string): DbListMember[] {
  return rows.map((w) => ({
    id: `${listId}:${w.domain.toLowerCase()}`,
    list_id: listId,
    user_id: userId,
    domain: w.domain.toLowerCase(),
    company_name: w.company_name,
    added_at: w.last_scored ?? "",
  }));
}

async function loadWatchlistRows(userId: string): Promise<WatchlistRow[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("watchlist")
    .select("domain, company_name, last_scored")
    .eq("user_id", userId)
    .eq("is_active", true);
  return (data ?? []) as WatchlistRow[];
}

/**
 * Members of one list. System lists derive from the live watchlist; pass `list` to skip the
 * lookup that decides which kind it is.
 */
export async function fetchListMembers(
  listId: string,
  userId: string,
  list?: Pick<DbList, "is_system">,
): Promise<DbListMember[]> {
  const supabase = createSupabaseAdmin();
  let isSystem = list?.is_system;
  if (isSystem === undefined) {
    const { data } = await supabase
      .from("lists")
      .select("is_system")
      .eq("id", listId)
      .eq("user_id", userId)
      .maybeSingle();
    isSystem = Boolean(data?.is_system);
  }
  if (isSystem) return systemMembersFromWatchlist(await loadWatchlistRows(userId), listId, userId);

  const { data } = await supabase
    .from("list_members")
    .select("*")
    .eq("list_id", listId)
    .eq("user_id", userId);
  return (data ?? []) as DbListMember[];
}

/** One query for every manual list's members, grouped by list id. */
export async function fetchManualMembersByList(
  userId: string,
  listIds: string[],
): Promise<Map<string, DbListMember[]>> {
  const grouped = new Map<string, DbListMember[]>();
  if (listIds.length === 0) return grouped;
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("list_members")
    .select("*")
    .eq("user_id", userId)
    .in("list_id", listIds);
  for (const row of (data ?? []) as DbListMember[]) {
    grouped.set(row.list_id, [...(grouped.get(row.list_id) ?? []), row]);
  }
  return grouped;
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
      scoreEvents: [],
    };
  });
}

/** Members added in the last 7 days. Null when it cannot be derived (smart and system lists). */
export function countAddedThisWeek(list: DbList, rows: DbListMember[], now = Date.now()): number | null {
  if (list.list_type !== "manual" || list.is_system) return null;
  const cutoff = now - WEEK_MS;
  return rows.filter((r) => new Date(r.added_at).getTime() > cutoff).length;
}

function resolveMembers(list: DbList, rows: DbListMember[], pool: AccountContext[]): AccountContext[] {
  return resolveListMembers(list, membersToContext(rows, pool), pool);
}

export async function buildListsOverview(userId: string): Promise<{
  summaries: ListCardSummary[];
  hero: ListsHeroStats;
  lists: DbList[];
}> {
  const lists = await fetchLists(userId);
  const { allAccounts, watchlistRows } = await fetchAccountPool(userId);
  const manualIds = lists.filter((l) => l.list_type === "manual" && !l.is_system).map((l) => l.id);
  const manualRows = await fetchManualMembersByList(userId, manualIds);

  const summaries: ListCardSummary[] = [];
  const domainToLists = new Map<string, string[]>();
  const memberContexts = new Map<string, AccountContext>();

  for (const list of lists) {
    const rows = list.is_system
      ? systemMembersFromWatchlist(watchlistRows, list.id, userId)
      : (manualRows.get(list.id) ?? []);
    const members = resolveMembers(list, rows, allAccounts);
    summaries.push(buildListCardSummary(list, members, countAddedThisWeek(list, rows)));
    for (const m of members) {
      domainToLists.set(m.domain, [...(domainToLists.get(m.domain) ?? []), list.name]);
      memberContexts.set(m.domain, m);
    }
  }

  const hero = buildHeroStats(summaries, domainToLists, [...memberContexts.values()]);
  return { summaries, hero, lists };
}

async function fetchPeopleByDomain(userId: string): Promise<Map<string, number>> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from("person_scores").select("company_domain").eq("user_id", userId);
  const byDomain = new Map<string, number>();
  for (const p of data ?? []) {
    const d = (p.company_domain as string | null)?.toLowerCase();
    if (d) byDomain.set(d, (byDomain.get(d) ?? 0) + 1);
  }
  return byDomain;
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

  const { allAccounts, watchlistRows } = await fetchAccountPool(userId);
  let rows: DbListMember[] = [];
  if (list.is_system) rows = systemMembersFromWatchlist(watchlistRows, list.id, userId);
  else if (list.list_type === "manual") rows = await fetchListMembers(list.id, userId, list);
  const members = resolveMembers(list, rows, allAccounts);
  const peopleByDomain = await fetchPeopleByDomain(userId);

  return buildListDetail(list, members, countAddedThisWeek(list, rows), peopleByDomain);
}

export async function previewSmartListCount(userId: string, rules: DbList["rules"]): Promise<number> {
  const { allAccounts } = await fetchAccountPool(userId);
  return resolveListMembers({ list_type: "smart", rules } as DbList, [], allAccounts).length;
}

/**
 * Makes sure the user has exactly one system list ("My Watchlist") whose members are derived live
 * from the active watchlist. Idempotent; a partial unique index makes concurrent calls safe.
 */
export async function ensureDefaultList(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: existing } = await supabase
    .from("lists")
    .select("id")
    .eq("user_id", userId)
    .eq("is_system", true)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from("lists").insert({
    user_id: userId,
    name: SYSTEM_LIST_NAME,
    description: "Synced from your watchlist",
    list_type: "manual",
    color: "#4ade80",
    icon_initials: "MW",
    is_system: true,
    auto_refresh: false,
  });
  if (error && error.code !== UNIQUE_VIOLATION) {
    // Most likely the is_system migration is not applied yet. Keep the page usable without the list.
    console.error("[lists] could not create the watchlist list", error.message);
  }
}
