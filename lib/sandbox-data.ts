import { briefContributionsFrom } from "@/lib/brief";
import { redactPublicSources } from "@/lib/public-source";
import { scrubVendorNames } from "@/lib/brief/scrub-vendors";
import type { BriefSpec } from "@/lib/brief";
import type { SignalContribution, SignalSet } from "@/lib/types";

type SupabaseLike = {
  from: (table: string) => unknown;
};

type QueryLike<TData> = PromiseLike<{ data: TData | null; error?: unknown }> & {
  eq: (column: string, value: unknown) => QueryLike<TData>;
  order: (column: string, options?: { ascending?: boolean }) => QueryLike<TData>;
  limit: (count: number) => QueryLike<TData>;
  single?: () => PromiseLike<{ data: Record<string, unknown> | null; error?: unknown }>;
};

export type SandboxResolvedData = Record<string, unknown>;

const ACCOUNT_PREFIX = "account:";
const SIGNAL_KEYS = ["funding", "hiring", "news", "technology", "web_activity", "web", "github"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function canonicalDomain(value: string): string {
  return value.trim().toLowerCase();
}

function scrubStrings<T>(value: T): T {
  if (typeof value === "string") return scrubVendorNames(value) as T;
  if (Array.isArray(value)) return value.map((item) => scrubStrings(item)) as T;
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = scrubStrings(child);
  }
  return next as T;
}

function selectRows<TData>(supabase: SupabaseLike, table: string, columns: string): QueryLike<TData> {
  const tableQuery = supabase.from(table) as { select: (columns?: string) => QueryLike<TData> };
  return tableQuery.select(columns);
}

function signalSummary(signals: unknown): Record<string, unknown> {
  if (!isRecord(signals)) return {};
  const output: Record<string, unknown> = {};
  for (const key of SIGNAL_KEYS) {
    const signal = signals[key];
    if (!isRecord(signal)) continue;
    output[key] = {
      score: num(signal.score) ?? 0,
      max: num(signal.max) ?? 0,
      detail: str(signal.detail) ?? "",
      ...(str(signal.status) ? { status: str(signal.status) } : {}),
      observed_at: typeof signal.observed_at === "string" || signal.observed_at === null
        ? signal.observed_at
        : null,
    };
  }
  return output;
}

function briefSummary(value: unknown): { personas: string[]; openers: Record<string, Record<string, string>> } | null {
  if (!isRecord(value)) return null;
  const brief = value as Partial<BriefSpec>;
  const personas = Array.isArray(brief.personas)
    ? brief.personas.filter((item): item is string => typeof item === "string")
    : [];
  const openers: Record<string, Record<string, string>> = {};
  if (isRecord(brief.openers)) {
    for (const [signal, byPersona] of Object.entries(brief.openers)) {
      if (!isRecord(byPersona)) continue;
      const mapped = Object.fromEntries(
        Object.entries(byPersona).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      );
      if (Object.keys(mapped).length > 0) openers[signal] = mapped;
    }
  }
  return personas.length > 0 || Object.keys(openers).length > 0 ? { personas, openers } : null;
}

function daysSince(iso: unknown, now = new Date()): number {
  const date = typeof iso === "string" ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

function freshestSignalDays(row: Record<string, unknown>, now = new Date()): number {
  const scoreAge = daysSince(row.created_at, now);
  const contributions = Array.isArray(row.contributions) ? row.contributions as SignalContribution[] : [];
  const ages = contributions
    .map((item) => typeof item.daysAgo === "number" ? item.daysAgo + scoreAge : null)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return ages.length > 0 ? Math.min(...ages) : scoreAge;
}

async function resolveAccount(supabase: SupabaseLike, userId: string, domain: string) {
  const query = selectRows<Record<string, unknown>[]>(supabase, "scores", "*")
    .eq("user_id", userId)
    .eq("domain", domain)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: row } = query.single
    ? await query.single()
    : { data: null };

  if (!row) return { error: "not_found" };

  const contributions = Array.isArray(row.contributions)
    ? briefContributionsFrom(row.contributions as SignalContribution[])
    : [];

  return {
    company: str(row.company_name) ?? domain,
    domain: str(row.domain) ?? domain,
    score: num(row.score) ?? null,
    band: str(row.score_band) ?? null,
    scored_at: str(row.created_at) ?? null,
    contributions,
    signals: signalSummary(row.signals as SignalSet | undefined),
    brief: briefSummary(row.brief),
  };
}

async function resolveRecentAccounts(supabase: SupabaseLike, userId: string) {
  const { data } = await selectRows<Record<string, unknown>[]>(
    supabase,
    "scores",
    "domain, company_name, score, score_band, created_at, contributions",
  )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  for (const row of data ?? []) {
    const domain = str(row.domain);
    if (!domain) continue;
    const canonical = canonicalDomain(domain);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    rows.push(row);
    if (rows.length >= 20) break;
  }

  return rows.map((row) => {
    const domain = canonicalDomain(str(row.domain) ?? "");
    return {
      domain,
      company: str(row.company_name) ?? domain,
      score: num(row.score) ?? null,
      band: str(row.score_band) ?? null,
      scored_at: str(row.created_at) ?? null,
      freshest_signal_days: freshestSignalDays(row),
    };
  });
}

export async function getPipelineSummaryData(supabase: SupabaseLike, userId: string) {
  const { data: watchlist } = await selectRows<Record<string, unknown>[]>(
    supabase,
    "watchlist",
    "domain, company_name, score, score_band, pipeline_stage, last_scored",
  )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("score", { ascending: false });

  if (!watchlist || watchlist.length === 0) {
    return { total: 0, stages: {}, message: "No companies in pipeline" };
  }

  const stages: Record<string, Array<{ domain: string; company_name: string; score: number | null }>> = {};
  for (const row of watchlist) {
    const stage = str(row.pipeline_stage) ?? "cold";
    if (!stages[stage]) stages[stage] = [];
    const domain = str(row.domain) ?? "";
    stages[stage].push({
      domain,
      company_name: str(row.company_name) ?? domain,
      score: num(row.score) ?? null,
    });
  }

  const counts: Record<string, number> = {};
  for (const [stage, companies] of Object.entries(stages)) {
    counts[stage] = companies.length;
  }

  return { total: watchlist.length, counts, top_per_stage: stages };
}

export async function resolveDataRefs(
  supabase: SupabaseLike,
  userId: string,
  refs: string[],
): Promise<SandboxResolvedData> {
  const output: SandboxResolvedData = {};
  for (const ref of refs.slice(0, 4)) {
    if (ref.startsWith(ACCOUNT_PREFIX)) {
      const domain = canonicalDomain(ref.slice(ACCOUNT_PREFIX.length));
      output[`${ACCOUNT_PREFIX}${domain}`] = await resolveAccount(supabase, userId, domain);
      continue;
    }
    if (ref === "accounts:recent") {
      output[ref] = await resolveRecentAccounts(supabase, userId);
      continue;
    }
    if (ref === "pipeline") {
      output[ref] = await getPipelineSummaryData(supabase, userId);
    }
  }

  return redactPublicSources(scrubStrings(output));
}
