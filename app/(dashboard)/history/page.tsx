import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { HistoryView } from "./history-view";

export interface ActivityBucket {
  date: string;
  hot: number;
  warm: number;
  cold: number;
}

export interface HistoryStats {
  totalCount: number;
  monthlyCount: number;
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
  ] = await Promise.all([
    supabase.from("scores").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("scores")
      .select("score, score_band, created_at, domain")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
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
  ]);

  const rows = monthlyRows ?? [];
  const monthlyCount = rows.length;
  const priorMonthCount = priorMonthRows?.length ?? 0;
  const hotCount = rows.filter(r => r.score_band === "HOT").length;
  const warmCount = rows.filter(r => r.score_band === "WARM").length;
  const coldCount = rows.filter(r => r.score_band === "COLD").length;
  const avgScore = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length * 10) / 10
    : 0;

  const uniqueDomains = new Set(rows.map(r => r.domain)).size;
  const rescoreCount = Math.max(0, monthlyCount - uniqueDomains);

  const bucketMap = new Map<string, { hot: number; warm: number; cold: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    bucketMap.set(key, { hot: 0, warm: 0, cold: 0 });
  }
  for (const r of rows) {
    const key = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const b = bucketMap.get(key);
    if (b) {
      if (r.score_band === "HOT") b.hot++;
      else if (r.score_band === "WARM") b.warm++;
      else b.cold++;
    }
  }
  const activityData: ActivityBucket[] = Array.from(bucketMap.entries()).map(([date, counts]) => ({ date, ...counts }));

  const stats: HistoryStats = {
    totalCount: totalCount ?? 0,
    monthlyCount,
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
