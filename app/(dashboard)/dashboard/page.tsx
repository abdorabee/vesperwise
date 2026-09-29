import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";

import DashboardHomeView from "@/components/dashboard/home/dashboard-home";
import { HotAccounts, HotAccountsSkeleton, type HotAccountRow } from "@/components/dashboard/home/hot-accounts";
import {
  RANGE_DAYS,
  SCORE_INDEX_LIMIT,
  computeKpis,
  creditUsage,
  dailyBandTrend,
  oneLineReason,
  parseRange,
  pickHotAccounts,
  recentActivity,
  signalChips,
  type HotCandidate,
  type ScoreDetail,
  type ScoreIndexRow,
} from "@/lib/dashboard-home";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";

export const metadata = { title: "Home" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Second query: stored reasoning + signals for the handful of accounts on the hero card only. */
async function HotAccountsSection({ candidates, now }: { candidates: HotCandidate[]; now: number }) {
  let details = new Map<string, ScoreDetail>();
  if (candidates.length > 0) {
    const { data } = await createSupabaseAdmin()
      .from("scores")
      .select("id, signals, contributions, why_now, ai_summary, score_explanation")
      .in(
        "id",
        candidates.map((c) => c.id),
      );
    details = new Map(((data ?? []) as Array<ScoreDetail & { id: string }>).map((d) => [d.id, d]));
  }

  const rows: HotAccountRow[] = candidates.map((c) => {
    const detail = details.get(c.id) ?? {};
    return { ...c, chips: signalChips(detail, now), reason: oneLineReason(detail) };
  });

  return <HotAccounts rows={rows} />;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const range = parseRange((await searchParams).range);
  const rangeDays = RANGE_DAYS[range];
  const admin = createSupabaseAdmin();

  const [userRow, indexRows, watchlistCount, bulkJobCount] = await Promise.all([
    admin
      .from("users")
      .select("credits_remaining, plan, subscription_renews_at")
      .eq("id", userId)
      .maybeSingle()
      .then((r) => r.data as Pick<DbUser, "credits_remaining" | "plan" | "subscription_renews_at"> | null),
    // Bounded index of the user's recent scores, light columns only. Every KPI,
    // the band trend, activity and hot-account ranking are derived from it.
    admin
      .from("scores")
      .select("id, domain, company_name, score, score_band, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(SCORE_INDEX_LIMIT)
      .then((r) => (r.data ?? []) as ScoreIndexRow[]),
    admin
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .then((r) => r.count ?? 0),
    admin
      .from("bulk_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then((r) => r.count ?? 0),
  ]);

  // Request time, not render purity: this page is dynamic per request.
  const now = new Date().getTime();
  const plan = userRow?.plan ?? "free";
  const credits = creditUsage(userRow?.credits_remaining ?? 0, PLAN_CREDITS[plan] ?? PLAN_CREDITS.free);
  const kpis = computeKpis(indexRows, now);
  const candidates = pickHotAccounts(indexRows);

  return (
    <DashboardHomeView
      now={now}
      range={range}
      kpis={kpis}
      credits={credits}
      renewsAt={userRow?.subscription_renews_at ?? null}
      trend={dailyBandTrend(indexRows, rangeDays, now)}
      activity={recentActivity(indexRows, 8, now - rangeDays * DAY_MS)}
      firstRun={{ hasWatchlist: watchlistCount > 0, hasBulkJob: bulkJobCount > 0 }}
      hotAccounts={
        <Suspense fallback={<HotAccountsSkeleton rows={Math.max(1, Math.min(candidates.length, 8))} />}>
          <HotAccountsSection candidates={candidates} now={now} />
        </Suspense>
      }
    />
  );
}
