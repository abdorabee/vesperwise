import { createSupabaseAdmin } from "@/lib/supabase";
import type { DbCreditLog, DbUser } from "@/lib/types";
import { PLAN_CREDITS } from "@/lib/types";
import { BILLING_TOPUPS, getPlanDef, type PlanKey } from "@/lib/billing-plans";
import { fetchPolarInvoices, type PolarInvoiceRow } from "@/lib/polar-invoices";

export type CreditBucket = "Score" | "Bulk" | "People" | "Autopilot" | "Chat" | "Top-up" | "Reset" | "Other";

export const COST_DISPLAY_BUCKETS: {
  bucket: CreditBucket;
  label: string;
  color: string;
}[] = [
  { bucket: "Score", label: "Score", color: "#dfff00" },
  { bucket: "Bulk", label: "Bulk jobs", color: "#a0a0a0" },
  { bucket: "People", label: "People scoring", color: "#4ade80" },
  { bucket: "Autopilot", label: "Autopilot", color: "#f5b544" },
  { bucket: "Chat", label: "Chat copilot", color: "#8a8f98" },
];

export interface CostBucketRow {
  bucket: CreditBucket;
  label: string;
  credits: number;
  pct: number;
  color: string;
}

export interface DailyUsageDay {
  date: string;
  score: number;
  bulk: number;
  people: number;
  autopilot: number;
  chat: number;
  other: number;
  total: number;
}

export interface LedgerRow {
  id: string;
  date: string;
  time: string;
  type: "debit" | "credit";
  title: string;
  subtitle: string;
  bucket: CreditBucket;
  amount: number;
  balance: number;
  color: string;
}

export interface BillingStats {
  profile: Pick<
    DbUser,
    | "plan"
    | "credits_remaining"
    | "polar_subscription_id"
    | "polar_customer_id"
    | "subscription_renews_at"
    | "subscription_cancel_at_period_end"
    | "email"
    | "workspace_name"
  >;
  totalCredits: number;
  usedCredits: number;
  creditsRemaining: number;
  burnRate7d: number;
  daysUntilDeplete: number | null;
  depletesBeforeRenewal: boolean;
  cycleStart: string;
  cycleTopupSpend: number;
  costBuckets: CostBucketRow[];
  totalCycleDebits: number;
  debitsLast14d: number;
  dailyUsage: DailyUsageDay[];
  ledger: LedgerRow[];
  ledgerTotal: number;
  maxDaily: number;
  invoices: PolarInvoiceRow[];
  invoicesYtdTotal: number;
}

const BUCKET_COLORS: Record<CreditBucket, string> = {
  Score: "#dfff00",
  Bulk: "#a0a0a0",
  People: "#4ade80",
  Autopilot: "#f5b544",
  Chat: "#8a8f98",
  "Top-up": "var(--warm)",
  Reset: "var(--hot)",
  Other: "#8a8f98",
};

export function bucketDisplayLabel(bucket: CreditBucket): string {
  const row = COST_DISPLAY_BUCKETS.find((b) => b.bucket === bucket);
  if (row) return row.label;
  if (bucket === "Top-up") return "Top-up";
  if (bucket === "Reset") return "Reset";
  return bucket;
}

export function classifyReason(reason: string, type: string): CreditBucket {
  const r = reason.toLowerCase();
  if (type === "credit" && r.includes("top-up")) return "Top-up";
  if (type === "credit" && (r.includes("reset") || r.includes("subscription"))) return "Reset";
  if (r.includes("autopilot")) return "Autopilot";
  if (r.includes("bulk")) return "Bulk";
  if (r.includes("person") || r.includes("people")) return "People";
  if (r.includes("chat") || r.includes("copilot")) return "Chat";
  if (r.includes("score") || r.includes("api")) return "Score";
  return "Other";
}

function cycleStartDate(renewsAt: string | null): Date {
  if (renewsAt) {
    const d = new Date(renewsAt);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function formatLedgerEntry(reason: string, type: string): { title: string; subtitle: string } {
  const r = reason.trim();
  const lower = r.toLowerCase();

  if (type === "credit" && lower.includes("top-up")) {
    return { title: r, subtitle: "One-time purchase · Polar" };
  }
  if (type === "credit" && (lower.includes("reset") || lower.includes("subscription"))) {
    return { title: r, subtitle: "Auto · billing cycle" };
  }
  if (lower.includes("bulk")) {
    return { title: r, subtitle: "Bulk job" };
  }
  if (lower.includes("person") || lower.includes("people")) {
    return { title: r, subtitle: "People scoring" };
  }
  if (lower.includes("autopilot")) {
    return { title: r, subtitle: "Autopilot flow" };
  }
  if (lower.includes("chat") || lower.includes("copilot")) {
    return { title: r, subtitle: "Chat copilot" };
  }
  if (lower.includes("score") || lower.includes("api")) {
    return { title: r, subtitle: "Score request" };
  }
  return { title: r, subtitle: type === "debit" ? "Credit debit" : "Credit added" };
}

function buildCostBuckets(
  bucketTotals: Map<CreditBucket, number>,
  totalCycleDebits: number,
): CostBucketRow[] {
  return COST_DISPLAY_BUCKETS.map(({ bucket, label, color }) => {
    const credits = bucketTotals.get(bucket) ?? 0;
    return {
      bucket,
      label,
      credits,
      pct:
        totalCycleDebits > 0
          ? credits > 0 && credits < 1
            ? 1
            : Math.round((credits / totalCycleDebits) * 100)
          : 0,
      color,
    };
  });
}

export async function buildBillingStats(userId: string): Promise<BillingStats> {
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from("users")
    .select(
      "plan, credits_remaining, polar_subscription_id, polar_customer_id, subscription_renews_at, subscription_cancel_at_period_end, email, workspace_name",
    )
    .eq("id", userId)
    .single();

  const p = profile ?? {
    plan: "free" as PlanKey,
    credits_remaining: 20,
    polar_subscription_id: null,
    polar_customer_id: null,
    subscription_renews_at: null,
    subscription_cancel_at_period_end: false,
    email: "",
    workspace_name: null,
  };

  const plan = (p.plan ?? "free") as PlanKey;
  const totalCredits = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const creditsRemaining = p.credits_remaining ?? 0;

  const cycleStart = cycleStartDate(p.subscription_renews_at);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const { data: logRows } = await supabase
    .from("credits_log")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  const logs = (logRows ?? []) as DbCreditLog[];

  const cycleLogs = logs.filter((l) => new Date(l.created_at) >= cycleStart);
  const debits7d = logs.filter(
    (l) => l.type === "debit" && new Date(l.created_at) >= sevenDaysAgo,
  );
  const burnRate7d =
    debits7d.length > 0
      ? Math.round((debits7d.reduce((s, l) => s + Number(l.amount), 0) / 7) * 10) / 10
      : 0;

  const daysUntilDeplete =
    burnRate7d > 0 ? Math.ceil(creditsRemaining / burnRate7d) : null;

  const resetDays = daysUntilReset(p.subscription_renews_at);
  let depletesBeforeRenewal = false;
  if (daysUntilDeplete != null && resetDays != null) {
    depletesBeforeRenewal = daysUntilDeplete < resetDays && creditsRemaining > 0;
  }

  const bucketTotals = new Map<CreditBucket, number>();
  let totalCycleDebits = 0;
  for (const log of cycleLogs) {
    if (log.type !== "debit") continue;
    const amt = Number(log.amount);
    totalCycleDebits += amt;
    const bucket = classifyReason(log.reason, log.type);
    bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + amt);
  }

  const usedCredits = totalCycleDebits;
  const costBuckets = buildCostBuckets(bucketTotals, totalCycleDebits);

  const debitsLast14d = logs
    .filter((l) => l.type === "debit" && new Date(l.created_at) >= fourteenDaysAgo)
    .reduce((s, l) => s + Number(l.amount), 0);

  const cycleTopupSpend = cycleLogs
    .filter((l) => l.type === "credit" && l.reason.toLowerCase().includes("top-up"))
    .reduce((s, l) => {
      const match = l.reason.match(/\((\d+) credits\)/);
      const credits = match ? parseInt(match[1], 10) : 0;
      const pack = BILLING_TOPUPS.find((t) => t.credits === credits);
      return s + (pack?.price ?? 0);
    }, 0);

  const dayMap = new Map<string, DailyUsageDay>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, {
      date: key,
      score: 0,
      bulk: 0,
      people: 0,
      autopilot: 0,
      chat: 0,
      other: 0,
      total: 0,
    });
  }

  for (const log of logs) {
    if (log.type !== "debit") continue;
    const key = log.created_at.slice(0, 10);
    const day = dayMap.get(key);
    if (!day) continue;
    const amt = Number(log.amount);
    const bucket = classifyReason(log.reason, log.type);
    day.total += amt;
    if (bucket === "Score") day.score += amt;
    else if (bucket === "Bulk") day.bulk += amt;
    else if (bucket === "People") day.people += amt;
    else if (bucket === "Autopilot") day.autopilot += amt;
    else if (bucket === "Chat") day.chat += amt;
    else day.other += amt;
  }

  const dailyUsage = Array.from(dayMap.values());
  const maxDaily = Math.max(...dailyUsage.map((d) => d.total), 1);

  const ledgerSlice = logs.slice(0, 30);
  let runningBalance = creditsRemaining;
  const ledger: LedgerRow[] = ledgerSlice.map((log) => {
    const bucket = classifyReason(log.reason, log.type);
    const amt = Number(log.amount);
    const { date, time } = formatDate(log.created_at);
    const { title, subtitle } = formatLedgerEntry(log.reason, log.type);
    const row: LedgerRow = {
      id: log.id,
      date,
      time,
      type: log.type as "debit" | "credit",
      title,
      subtitle,
      bucket,
      amount: amt,
      balance: runningBalance,
      color: BUCKET_COLORS[bucket],
    };
    if (log.type === "debit") runningBalance += amt;
    else runningBalance -= amt;
    return row;
  });

  const { count: ledgerTotal } = await supabase
    .from("credits_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  let invoices: PolarInvoiceRow[] = [];
  let invoicesYtdTotal = 0;
  if (p.polar_customer_id) {
    const polarData = await fetchPolarInvoices(p.polar_customer_id);
    invoices = polarData.invoices;
    invoicesYtdTotal = polarData.ytdTotal;
  }

  return {
    profile: p as BillingStats["profile"],
    totalCredits,
    usedCredits,
    creditsRemaining,
    burnRate7d,
    daysUntilDeplete,
    depletesBeforeRenewal,
    cycleStart: cycleStart.toISOString(),
    cycleTopupSpend,
    costBuckets,
    totalCycleDebits,
    debitsLast14d,
    dailyUsage,
    ledger,
    ledgerTotal: ledgerTotal ?? logs.length,
    maxDaily,
    invoices,
    invoicesYtdTotal,
  };
}

export function formatRenewDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntilReset(renewsAt: string | null): number | null {
  if (!renewsAt) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  }
  const diff = new Date(renewsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function nextInvoiceAmount(plan: PlanKey): number {
  return getPlanDef(plan).price;
}

