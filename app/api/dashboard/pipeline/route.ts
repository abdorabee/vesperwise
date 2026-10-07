import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redactPublicSources } from "@/lib/public-source";
import { createSupabaseAdmin } from "@/lib/supabase";

export interface PipelineSignals {
  funding?: { score: number; max: number };
  hiring?: { score: number; max: number };
  news?: { score: number; max: number };
  technology?: { score: number; max: number };
  web_activity?: { score: number; max: number };
  web?: { score: number; max: number };
}

export interface PipelineCompany {
  id: string;
  domain: string;
  company_name: string;
  score: number | null;
  score_band: "HOT" | "WARM" | "COLD" | null;
  last_scored: string | null;
  trend: number | null;
  email_subject: string | null;
  talk_track: string | null;
  ai_summary: string | null;
  key_triggers: string[] | null;
  urgency: string | null;
  pipeline_stage: string;
  signals: PipelineSignals | null;
  score_id: string | null;
  score_status: "complete" | "partial" | null;
  data_coverage: number | null;
  outcome: {
    outcome: "closed_won" | "closed_lost" | "no_decision" | "disqualified";
    occurred_at: string;
    value: number | null;
    reason: string | null;
  } | null;
}

/** Until a user drags a card, place it in the stage that matches its score band. */
function defaultStage(band: PipelineCompany["score_band"]): string {
  if (band === "HOT") return "hot";
  if (band === "WARM") return "warming";
  return "cold";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  // Fetch active watchlist
  const { data: watchlist, error: wError } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("score", { ascending: false });

  if (wError) return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  if (!watchlist || watchlist.length === 0) {
    return NextResponse.json({ companies: [] });
  }

  const domains = watchlist.map((w) => w.domain);

  // Fetch last 3 scores per domain (for trend computation + AI fields)
  const { data: recentScores } = await supabase
    .from("scores")
    .select("id, domain, score, score_status, data_coverage, created_at, email_subject, talk_track, ai_summary, key_triggers, urgency, signals")
    .eq("user_id", userId)
    .in("domain", domains)
    .order("created_at", { ascending: false })
    .limit(domains.length * 3);

  // Group scores by domain (already sorted newest first)
  const scoreIds = (recentScores ?? []).map((score) => score.id);
  const { data: outcomes } = scoreIds.length > 0
    ? await supabase
        .from("score_outcomes")
        .select("score_id, outcome, occurred_at, value, reason")
        .eq("user_id", userId)
        .in("score_id", scoreIds)
    : { data: [] };
  const outcomesByScore = new Map(
    (outcomes ?? []).map((outcome) => [outcome.score_id, outcome])
  );
  const scoresByDomain = new Map<string, Array<{
    id: string;
    score: number;
    score_status: "complete" | "partial";
    data_coverage: number | null;
    email_subject: string | null;
    talk_track: string | null;
    ai_summary: string | null;
    key_triggers: string[] | null;
    urgency: string | null;
    signals: PipelineSignals | null;
  }>>();
  for (const s of recentScores ?? []) {
    if (!scoresByDomain.has(s.domain)) scoresByDomain.set(s.domain, []);
    const arr = scoresByDomain.get(s.domain)!;
    if (arr.length < 3) arr.push(s);
  }

  // Build pipeline companies
  const companies: PipelineCompany[] = watchlist.map((w) => {
    const scores = scoresByDomain.get(w.domain) ?? [];
    const latest = scores[0] ?? null;
    const previous = scores[1] ?? null;
    const trend = latest && previous ? latest.score - previous.score : null;

    return {
      id: w.id,
      domain: w.domain,
      company_name: w.company_name,
      score: w.score ?? null,
      score_band: w.score_band ?? null,
      last_scored: w.last_scored ?? null,
      trend,
      email_subject: latest?.email_subject ?? null,
      talk_track: latest?.talk_track ?? null,
      ai_summary: latest?.ai_summary ?? null,
      key_triggers: latest?.key_triggers ?? null,
      urgency: latest?.urgency ?? null,
      pipeline_stage: w.pipeline_stage ?? defaultStage(w.score_band ?? null),
      signals: latest?.signals ? redactPublicSources(latest.signals) : null,
      score_id: latest?.id ?? null,
      score_status: latest?.score_status ?? null,
      data_coverage: latest?.data_coverage == null ? null : Number(latest.data_coverage),
      outcome: latest ? outcomesByScore.get(latest.id) ?? null : null,
    };
  });

  return NextResponse.json({ companies });
}
