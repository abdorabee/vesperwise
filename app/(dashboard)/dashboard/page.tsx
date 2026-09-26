import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_CREDITS } from "@/lib/types";
import DashboardHomeView from "@/components/dashboard/home/dashboard-home";

export const metadata = { title: "Intent Hub" };

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const admin = createSupabaseAdmin();

  const [userRow, allScoresRaw, autopilotRunsRaw, activityScoresRaw, autopilotActionsRaw, watchlistRaw, workflowRaw] =
    await Promise.all([
      admin.from("users").select("credits_remaining, plan").eq("id", userId).single().then((r) => r.data),
      admin
        .from("scores")
        .select("domain, score_band, score, company_name, created_at, signals")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .then((r) => r.data ?? []),
      admin
        .from("autopilot_runs")
        .select("companies_triggered")
        .eq("user_id", userId)
        .gte("started_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .then((r) => r.data ?? []),
      admin
        .from("scores")
        .select("company_name, score, score_band, created_at, signals")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8)
        .then((r) => r.data ?? []),
      admin
        .from("autopilot_actions")
        .select("company_name, action_type, trigger_reason, created_at, new_band, new_score")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)
        .then((r) => r.data ?? []),
      admin
        .from("watchlist")
        .select("company_name, score, score_band, pipeline_stage, previous_score")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("score", { ascending: false })
        .limit(20)
        .then((r) => r.data ?? []),
      admin
        .from("autopilot_workflows")
        .select("id, name, is_enabled, total_runs, conditions, actions")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6)
        .then((r) => r.data ?? []),
    ]);

  const plan = ((userRow?.plan as string) ?? "free") as "free" | "starter" | "growth" | "pro" | "agency";
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const creditsRemaining = userRow?.credits_remaining ?? 0;

  // Band counts — latest score per domain
  const latestByDomain = new Map<string, string>();
  (allScoresRaw as Array<{ domain: string; score_band: string }>).forEach((s) => {
    if (!latestByDomain.has(s.domain)) latestByDomain.set(s.domain, s.score_band);
  });
  const bands = [...latestByDomain.values()];
  const bandCounts = {
    hot: bands.filter((b) => b === "HOT").length,
    warm: bands.filter((b) => b === "WARM").length,
    cold: bands.filter((b) => b === "COLD").length,
  };

  // Avg HOT score
  const hotScores = (allScoresRaw as Array<{ score_band: string; score: number }>).filter(
    (s) => s.score_band === "HOT"
  );
  const avgHotScore =
    hotScores.length > 0
      ? Math.round((hotScores.reduce((acc, s) => acc + s.score, 0) / hotScores.length) * 10) / 10
      : 0;

  // Autopilot fires (last 30d)
  const autopilotFires = (autopilotRunsRaw as Array<{ companies_triggered: number | null }>).reduce(
    (acc, r) => acc + (r.companies_triggered ?? 0),
    0
  );

  // Activity rows
  type ActivityRow = {
    type: "score" | "autopilot";
    company: string;
    score: number;
    band: string;
    reason?: string;
    createdAt: string;
  };
  const activity: ActivityRow[] = [
    ...(
      activityScoresRaw as Array<{ company_name: string; score: number; score_band: string; created_at: string }>
    ).map((s) => ({
      type: "score" as const,
      company: s.company_name,
      score: s.score,
      band: s.score_band,
      createdAt: s.created_at,
    })),
    ...(
      autopilotActionsRaw as Array<{
        company_name: string;
        action_type: string;
        trigger_reason: string;
        created_at: string;
        new_band: string;
        new_score: number;
      }>
    ).map((a) => ({
      type: "autopilot" as const,
      company: a.company_name,
      score: a.new_score,
      band: a.new_band,
      reason: a.trigger_reason,
      createdAt: a.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Top movers
  type MoverRow = { n: string; s: number; d: number; band: string };
  const topMovers: MoverRow[] = (
    watchlistRaw as Array<{ company_name: string; score: number; score_band: string; previous_score: number | null }>
  )
    .map((w) => ({
      n: w.company_name,
      s: w.score ?? 0,
      d: w.previous_score != null ? (w.score ?? 0) - w.previous_score : 0,
      band: w.score_band,
    }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 6);

  // Pipeline by band
  const pipelineMap: Record<string, number> = {};
  (watchlistRaw as Array<{ pipeline_stage: string }>).forEach((w) => {
    const stage = w.pipeline_stage ?? "cold";
    pipelineMap[stage] = (pipelineMap[stage] ?? 0) + 1;
  });
  const total = watchlistRaw.length || 1;
  type PipelineRow = { l: string; n: number; c: string; glow?: boolean; pct: number };
  const pipeline: PipelineRow[] = [
    { l: "HOT", n: pipelineMap["hot"] ?? 0, c: "#4ade80", glow: true },
    { l: "Warming", n: pipelineMap["warming"] ?? 0, c: "#f5b544" },
    { l: "Cold", n: pipelineMap["cold"] ?? 0, c: "var(--text-tertiary)" },
    { l: "Engaged", n: pipelineMap["engaged"] ?? 0, c: "#e8ff40" },
  ].map((p) => ({ ...p, pct: Math.round((p.n / total) * 1000) / 10 }));

  // Signal mix
  type SignalMixRow = { key: string; label: string; pct: number };
  const signalKeys = ["funding", "hiring", "news", "technology"] as const;
  const signalTotals: Record<string, number> = { funding: 0, hiring: 0, news: 0, technology: 0 };
  let sigCount = 0;
  (
    activityScoresRaw as Array<{
      score_band: string;
      signals: Record<string, { score: number; max: number }> | null;
    }>
  )
    .filter((s) => s.score_band === "HOT")
    .forEach((s) => {
      signalKeys.forEach((k) => {
        if (s.signals?.[k]) signalTotals[k] += (s.signals[k].score / s.signals[k].max) * 100;
      });
      sigCount++;
    });
  const signalLabelMap: Record<string, string> = {
    funding: "Funding",
    hiring: "Hiring",
    news: "News",
    technology: "Technology changes",
  };
  const signalMix: SignalMixRow[] =
    sigCount > 0
      ? signalKeys.map((k) => ({
          key: k,
          label: signalLabelMap[k],
          pct: Math.round(signalTotals[k] / sigCount),
        }))
      : [];

  type WatchlistItem = { n: string; s: number; band: "hot" | "warm" | "cold" };
  const watchlist: WatchlistItem[] = (
    watchlistRaw as Array<{ company_name: string; score: number; score_band: string }>
  ).map((w) => ({
    n: w.company_name,
    s: w.score ?? 0,
    band: (w.score_band ?? "cold").toLowerCase() as "hot" | "warm" | "cold",
  }));

  type WorkflowRow = { n: string; active: boolean; fires: string; rate: string };
  const autopilotWorkflows: WorkflowRow[] = (
    workflowRaw as Array<{ name: string; is_enabled: boolean; total_runs: number }>
  ).map((w) => ({
    n: w.name,
    active: w.is_enabled,
    fires: String(w.total_runs),
    rate: "—",
  }));

  return (
    <DashboardHomeView
      hotCount={bandCounts.hot}
      warmCount={bandCounts.warm}
      coldCount={bandCounts.cold}
      avgHotScore={avgHotScore}
      autopilotFires={autopilotFires}
      creditsRemaining={creditsRemaining}
      creditCap={creditCap}
      activityRows={activity}
      topMovers={topMovers}
      pipeline={pipeline}
      signalMix={signalMix}
      watchlist={watchlist}
      autopilotWorkflows={autopilotWorkflows}
    />
  );
}
