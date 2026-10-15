import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import { redactPublicSources } from "@/lib/public-source";
import {
  canonicalizeDomain,
  InsufficientCreditsError,
  InvalidDomainError,
  ScoreInProgressError,
  scoreCompany,
  UnscorableDomainError,
  type StoredIntentScore,
} from "@/lib/score-service";
import type { ScoreProgressHandler } from "@/lib/score-progress";
import { getActiveScoringVersion } from "@/lib/scorer";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  PLAN_CREDITS,
  PLAN_WATCHLIST_LIMIT,
  type BusinessProfile,
  type DbUser,
  type ScoreBand,
} from "@/lib/types";

/**
 * What every MCP tool gets about the caller. Resolved once per request from
 * the API key, so tools never trust a user id passed in by the model.
 */
export interface McpUser {
  userId: string;
  plan: DbUser["plan"];
  productCategory: string;
  businessProfile: BusinessProfile | null;
}

/** A failure the model should read and act on (not a server crash). */
export class McpToolError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "McpToolError";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDomain(input: string): string {
  try {
    return canonicalizeDomain(input);
  } catch (error) {
    if (error instanceof InvalidDomainError) {
      throw new McpToolError(`"${input}" is not a valid company domain.`, "invalid_domain");
    }
    throw error;
  }
}

export async function loadMcpUser(userId: string): Promise<McpUser | null> {
  const { data } = await createSupabaseAdmin()
    .from("users")
    .select("plan, product_category, business_profile")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const plan: DbUser["plan"] = data.plan && data.plan in PLAN_CREDITS ? data.plan : "free";
  return {
    userId,
    plan,
    productCategory: data.product_category ?? "B2B SaaS",
    businessProfile: (data.business_profile ?? null) as BusinessProfile | null,
  };
}

// ─── score_company ──────────────────────────────────────────────────────────

/** The fields Claude needs to reason about an account; drops policy and raw evidence. */
export function summarizeScore(result: StoredIntentScore) {
  const redacted = redactPublicSources(result);
  return {
    company: redacted.company,
    domain: redacted.domain,
    intent_score: redacted.intent_score,
    score_band: redacted.score_band,
    score_status: redacted.score_status,
    data_coverage: redacted.data_coverage,
    icp_fit_score: redacted.icp_fit_score,
    buying_stage: redacted.buying_stage,
    urgency: redacted.urgency,
    key_triggers: redacted.key_triggers,
    why_now: redacted.why_now,
    ai_summary: redacted.ai_summary,
    recommended_action: redacted.recommended_action,
    email_subject: redacted.email_subject,
    talk_track: redacted.talk_track,
    signals: (redacted.contributions ?? []).map((c) => ({
      type: c.type,
      status: c.status,
      summary: c.summary,
      observed_at: c.observedAt,
    })),
    scored_at: redacted.last_updated,
    cached: redacted.cached,
    credit_charged: redacted.charged,
  };
}

export async function scoreCompanyTool(
  user: McpUser,
  input: { domain: string; company?: string },
  onProgress?: ScoreProgressHandler
) {
  const domain = toDomain(input.domain);
  try {
    const result = await scoreCompany({
      domain,
      userId: user.userId,
      companyName: input.company,
      productCategory: user.productCategory,
      businessProfile: user.businessProfile,
      skipCredits: isDevCreditBypassEnabled(),
      onProgress,
    });
    return summarizeScore(result);
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw new McpToolError(
        `Out of credits (${error.creditsRemaining} left). Top up or upgrade at https://www.vesperwise.com/billing.`,
        "insufficient_credits"
      );
    }
    if (error instanceof ScoreInProgressError) {
      throw new McpToolError(`A score for ${domain} is already running. Try again in a few seconds.`, "score_in_progress");
    }
    if (error instanceof UnscorableDomainError) {
      throw new McpToolError(`Not enough public signal to score ${domain}. No credit was charged.`, "unscorable");
    }
    throw error;
  }
}

// ─── get_company / get_opener_brief / score_history ──────────────────────────

async function latestStoredScore(userId: string, domain: string) {
  const { data, error } = await createSupabaseAdmin()
    .from("scores")
    .select(
      "company_name, domain, score, score_band, score_status, data_coverage, icp_fit_score, ai_summary, recommended_action, buying_stage, urgency, key_triggers, why_now, email_subject, talk_track, created_at"
    )
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("scoring_version", getActiveScoringVersion())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function ageInDays(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS));
}

export async function getCompanyTool(user: McpUser, input: { domain: string }, now = Date.now()) {
  const domain = toDomain(input.domain);
  const score = await latestStoredScore(user.userId, domain);
  if (!score) {
    return { domain, found: false, hint: "Not scored yet. score_company costs 1 credit." };
  }
  return {
    found: true,
    company: score.company_name,
    domain: score.domain,
    intent_score: score.score,
    score_band: score.score_band,
    score_status: score.score_status,
    data_coverage: score.data_coverage,
    icp_fit_score: score.icp_fit_score,
    buying_stage: score.buying_stage,
    urgency: score.urgency,
    key_triggers: score.key_triggers,
    why_now: score.why_now,
    ai_summary: score.ai_summary,
    recommended_action: score.recommended_action,
    scored_at: score.created_at,
    age_days: ageInDays(score.created_at, now),
  };
}

export async function getOpenerBriefTool(
  user: McpUser,
  input: { domain: string; tone?: string; angle?: string },
  now = Date.now()
) {
  const domain = toDomain(input.domain);
  const score = await latestStoredScore(user.userId, domain);
  if (!score) {
    return { domain, found: false, hint: "Not scored yet. Run score_company first (1 credit)." };
  }
  return {
    found: true,
    company: score.company_name,
    domain: score.domain,
    intent_score: score.score,
    score_band: score.score_band,
    buying_stage: score.buying_stage,
    urgency: score.urgency,
    key_triggers: score.key_triggers,
    why_now: score.why_now,
    suggested_subject: score.email_subject,
    talk_track: score.talk_track,
    seller_context: {
      product_category: user.productCategory,
      buyer_role: user.businessProfile?.buyer_role ?? null,
      sales_motion: user.businessProfile?.sales_motion ?? null,
    },
    requested_tone: input.tone ?? "casual",
    requested_angle: input.angle ?? null,
    scored_at: score.created_at,
    age_days: ageInDays(score.created_at, now),
    instruction:
      "Write a short, specific opener that cites one or two of the key triggers. Do not invent facts beyond this brief.",
  };
}

export async function scoreHistoryTool(user: McpUser, input: { domain: string }, now = Date.now()) {
  const domain = toDomain(input.domain);
  const since = new Date(now - 90 * DAY_MS).toISOString();
  const { data, error } = await createSupabaseAdmin()
    .from("scores")
    .select("score, score_band, score_status, created_at")
    .eq("user_id", user.userId)
    .eq("domain", domain)
    .eq("scoring_version", getActiveScoringVersion())
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return { domain, history: data ?? [] };
}

// ─── watchlist ───────────────────────────────────────────────────────────────

export async function listWatchlistTool(user: McpUser, input: { band?: ScoreBand; stage?: string }) {
  let query = createSupabaseAdmin()
    .from("watchlist")
    .select("domain, company_name, score, score_band, previous_score, pipeline_stage, last_scored")
    .eq("user_id", user.userId)
    .eq("is_active", true)
    .order("score", { ascending: false, nullsFirst: false });
  if (input.band) query = query.eq("score_band", input.band);
  if (input.stage) query = query.eq("pipeline_stage", input.stage);
  const { data, error } = await query;
  if (error) throw error;
  const limit = PLAN_WATCHLIST_LIMIT[user.plan];
  return { accounts: data ?? [], count: data?.length ?? 0, plan_limit: limit };
}

export async function addToWatchlistTool(user: McpUser, input: { domain: string; company?: string }) {
  const domain = toDomain(input.domain);
  const supabase = createSupabaseAdmin();
  const { count, error: countError } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.userId)
    .eq("is_active", true);
  if (countError) throw countError;

  const limit = PLAN_WATCHLIST_LIMIT[user.plan];
  if (limit !== null && (count ?? 0) >= limit) {
    throw new McpToolError(
      `Watchlist is full (${limit} accounts on the ${user.plan} plan). Remove one or upgrade.`,
      "watchlist_limit"
    );
  }

  const { data, error } = await supabase
    .from("watchlist")
    .upsert({ user_id: user.userId, domain, company_name: input.company?.trim() || domain, is_active: true })
    .select("domain, company_name, score, score_band, pipeline_stage")
    .single();
  if (error) throw error;
  return { added: data };
}

export async function removeFromWatchlistTool(user: McpUser, input: { domain: string }) {
  const domain = toDomain(input.domain);
  const { data, error } = await createSupabaseAdmin()
    .from("watchlist")
    .update({ is_active: false })
    .eq("user_id", user.userId)
    .eq("domain", domain)
    .eq("is_active", true)
    .select("domain");
  if (error) throw error;
  if (!data?.length) throw new McpToolError(`${domain} is not on the watchlist.`, "not_found");
  return { removed: domain };
}

// ─── whats_changed ───────────────────────────────────────────────────────────

export interface ScorePoint {
  domain: string;
  score: number | null;
  score_band: ScoreBand | null;
  created_at: string;
}

export interface WatchedAccount {
  domain: string;
  company_name: string;
}

export interface AccountChange {
  domain: string;
  company: string;
  score: number | null;
  score_band: ScoreBand | null;
  previous_score: number | null;
  previous_band: ScoreBand | null;
  delta: number | null;
  became_hot: boolean;
  last_scored: string | null;
}

/**
 * Compares each watched account's newest score against its newest score from
 * before `since`. Accounts not re-scored since then are reported as stale,
 * because a missing re-score is not the same as "nothing changed".
 */
export function computeChanges(
  watched: WatchedAccount[],
  points: ScorePoint[],
  since: number,
  minDelta = 0
): { changed: AccountChange[]; unchanged: number; stale: Array<{ domain: string; company: string; last_scored: string | null }> } {
  const byDomain = new Map<string, ScorePoint[]>();
  for (const p of points) {
    const list = byDomain.get(p.domain) ?? [];
    list.push(p);
    byDomain.set(p.domain, list);
  }

  const changed: AccountChange[] = [];
  const stale: Array<{ domain: string; company: string; last_scored: string | null }> = [];
  let unchanged = 0;

  for (const account of watched) {
    const history = (byDomain.get(account.domain) ?? [])
      .slice()
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const latest = history.at(-1) ?? null;
    if (!latest || Date.parse(latest.created_at) < since) {
      stale.push({ domain: account.domain, company: account.company_name, last_scored: latest?.created_at ?? null });
      continue;
    }
    const before = history.filter((p) => Date.parse(p.created_at) < since).at(-1) ?? null;
    const delta = before?.score != null && latest.score != null ? latest.score - before.score : null;
    const becameHot = latest.score_band === "HOT" && before?.score_band !== "HOT";
    const isNew = before === null;
    if (isNew || becameHot || (delta !== null && Math.abs(delta) >= Math.max(minDelta, 1))) {
      changed.push({
        domain: account.domain,
        company: account.company_name,
        score: latest.score,
        score_band: latest.score_band,
        previous_score: before?.score ?? null,
        previous_band: before?.score_band ?? null,
        delta,
        became_hot: becameHot,
        last_scored: latest.created_at,
      });
    } else {
      unchanged += 1;
    }
  }

  changed.sort((a, b) => Number(b.became_hot) - Number(a.became_hot) || (b.delta ?? 0) - (a.delta ?? 0));
  return { changed, unchanged, stale };
}

export async function whatsChangedTool(
  user: McpUser,
  input: { days?: number; min_delta?: number },
  now = Date.now()
) {
  const days = input.days ?? 7;
  const since = now - days * DAY_MS;
  const supabase = createSupabaseAdmin();
  const { data: watched, error: watchError } = await supabase
    .from("watchlist")
    .select("domain, company_name")
    .eq("user_id", user.userId)
    .eq("is_active", true);
  if (watchError) throw watchError;
  if (!watched?.length) return { days, changed: [], unchanged: 0, stale: [], note: "The watchlist is empty." };

  // Older watchlist rows can hold a raw URL ("https://acme.com"); scores are keyed by canonical domain.
  const accounts = watched.map((w) => {
    try {
      return { domain: canonicalizeDomain(w.domain), company_name: w.company_name };
    } catch {
      return w;
    }
  });

  const { data: points, error } = await supabase
    .from("scores")
    .select("domain, score, score_band, created_at")
    .eq("user_id", user.userId)
    .eq("scoring_version", getActiveScoringVersion())
    .in("domain", accounts.map((a) => a.domain))
    .gte("created_at", new Date(now - 90 * DAY_MS).toISOString());
  if (error) throw error;

  const result = computeChanges(accounts, (points ?? []) as ScorePoint[], since, input.min_delta ?? 0);
  return {
    days,
    ...result,
    note:
      result.stale.length > 0
        ? "Stale accounts were not re-scored in this window, so changes there are unknown. score_company refreshes one (1 credit)."
        : undefined,
  };
}

// ─── prioritize ──────────────────────────────────────────────────────────────

export async function prioritizeTool(user: McpUser, input: { domains: string[] }) {
  const domains: string[] = [];
  const invalid: string[] = [];
  for (const raw of input.domains) {
    try {
      domains.push(canonicalizeDomain(raw));
    } catch (error) {
      if (error instanceof InvalidDomainError) invalid.push(raw);
      else throw error;
    }
  }
  const unique = [...new Set(domains)];
  const { data, error } = unique.length
    ? await createSupabaseAdmin()
        .from("scores")
        .select("domain, company_name, score, score_band, urgency, created_at")
        .eq("user_id", user.userId)
        .eq("scoring_version", getActiveScoringVersion())
        .in("domain", unique)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) throw error;

  const latest = new Map<string, NonNullable<typeof data>[number]>();
  for (const row of data ?? []) if (!latest.has(row.domain)) latest.set(row.domain, row);

  const ranked = [...latest.values()].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const unscored = unique.filter((d) => !latest.has(d));
  return { ranked, unscored, invalid };
}

// ─── get_account ─────────────────────────────────────────────────────────────

export async function getAccountTool(user: McpUser) {
  const supabase = createSupabaseAdmin();
  const [{ data: row, error }, { count, error: countError }] = await Promise.all([
    supabase.from("users").select("plan, credits_remaining, credits_reset_at").eq("id", user.userId).maybeSingle(),
    supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", user.userId).eq("is_active", true),
  ]);
  if (error) throw error;
  if (countError) throw countError;
  return {
    plan: user.plan,
    credits_remaining: row?.credits_remaining ?? 0,
    monthly_credits: PLAN_CREDITS[user.plan],
    credits_reset_at: row?.credits_reset_at ?? null,
    watchlist_used: count ?? 0,
    watchlist_limit: PLAN_WATCHLIST_LIMIT[user.plan],
    costs: { score_company: "1 credit (free on a recent cached score)", everything_else: "free" },
  };
}
