import { auth } from "@clerk/nextjs/server";
import { sumLedgerDebits } from "@/lib/credits-status";
import { createSupabaseAdmin } from "@/lib/supabase";
import { HistoryView } from "./history-view";

export const metadata = { title: "Score history" };

export interface ActivityBucket {
  date: string;
  hot: number;
  warm: number;
  cold: number;
}

export interface HistoryStats {
  totalCount: number;
  monthlyCount: number;
  creditsUsed30d: number;
  priorMonthCount: number;
  hotCount: number;
  warmCount: number;
  coldCount: number;
  avgScore: number;
  flippedToHot: number;
  rescoreCount: number;
  lastScoredAt: string | null;
  activityData: ActivityBucket[];
}

/**
 * Stat cards, band chips and the activity strip are explicit last-30-day
 * figures. Counts come from exact `count` queries (no row cap); the average,
 * re-score count and day buckets are computed from the most recent
 * MONTHLY_SAMPLE_LIMIT rows, so they stay bounded below Supabase's row cap.
 */
const MONTHLY_SAMPLE_LIMIT = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Day buckets are UTC calendar days, on both the key and the label, so server locale never shifts a run to another day. */
function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = createSupabaseAdmin();

  // This server-rendered page uses one request-time snapshot for every range calculation.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalCount },
    { data: monthlyRows },
    { count: flippedToHot },
    { data: lastScoreRow },
    { data: priorMonthRows },
    { data: debitRows },
    { count: monthlyTotal },
    { count: hotTotal },
    { count: warmTotal },
    { count: coldTotal },
  ] = await Promise.all([
    supabase.from("scores").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("scores")
      .select("score, score_band, created_at, domain")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(MONTHLY_SAMPLE_LIMIT),
    supabase.from("scores")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("score_band", "HOT")
      .gte("created_at", sevenDaysAgo),
    supabase.from("scores")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("scores")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", sixtyDaysAgo)
      .lt("created_at", thirtyDaysAgo),
    supabase.from("credits_log")
      .select("amount, type")
      .eq("user_id", userId)
      .eq("type", "debit")
      .gte("created_at", thirtyDaysAgo),
    ...(["", "HOT", "WARM", "COLD"] as const).map((band) => {
      const query = supabase.from("scores").select("id", { count: "exact", head: true })
        .eq("user_id", userId).gte("created_at", thirtyDaysAgo);
      return band ? query.eq("score_band", band) : query;
    }),
  ]);

  const rows = monthlyRows ?? [];
  const monthlyCount = monthlyTotal ?? rows.length;
  const priorMonthCount = priorMonthRows?.length ?? 0;
  const hotCount = hotTotal ?? rows.filter(r => r.score_band === "HOT").length;
  const warmCount = warmTotal ?? rows.filter(r => r.score_band === "WARM").length;
  const coldCount = coldTotal ?? rows.filter(r => r.score_band === "COLD").length;
  const avgScore = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length * 10) / 10
    : 0;

  const uniqueDomains = new Set(rows.map(r => r.domain)).size;
  const rescoreCount = Math.max(0, rows.length - uniqueDomains);

  const bucketMap = new Map<string, { hot: number; warm: number; cold: number }>();
  for (let i = 29; i >= 0; i--) {
    bucketMap.set(utcDayKey(new Date(now - i * DAY_MS)), { hot: 0, warm: 0, cold: 0 });
  }
  for (const r of rows) {
    const key = utcDayKey(new Date(r.created_at));
    const b = bucketMap.get(key);
    if (b) {
      if (r.score_band === "HOT") b.hot++;
      else if (r.score_band === "WARM") b.warm++;
      else b.cold++;
    }
  }
  const activityData: ActivityBucket[] = Array.from(bucketMap.entries()).map(([key, counts]) => ({
    date: utcDayLabel(new Date(`${key}T00:00:00Z`)),
    ...counts,
  }));

  const stats: HistoryStats = {
    totalCount: totalCount ?? 0,
    monthlyCount,
    creditsUsed30d: sumLedgerDebits(
      (debitRows ?? []).map((row) => ({ type: row.type, amount: Number(row.amount) })),
    ),
    priorMonthCount,
    hotCount,
    warmCount,
    coldCount,
    avgScore,
    flippedToHot: flippedToHot ?? 0,
    rescoreCount,
    lastScoredAt: lastScoreRow?.created_at ?? null,
    activityData,
  };

  return <HistoryView stats={stats} />;
}
