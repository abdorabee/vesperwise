import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ScoreView } from "./score-view";
import type { RecentScore } from "./score-view";

export const metadata = { title: "Score a company" };

export default async function ScorePage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseAdmin();
  let creditsRemaining = 0;
  let recentScores: RecentScore[] = [];

  const [userResult, scoresResult] = await Promise.all([
    supabase.from("users").select("credits_remaining").eq("id", userId).single(),
    supabase
      .from("scores")
      .select("domain, company_name, score, score_band, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (userResult.data) creditsRemaining = userResult.data.credits_remaining;
  if (scoresResult.data) recentScores = scoresResult.data as RecentScore[];

  return <ScoreView creditsRemaining={creditsRemaining} recentScores={recentScores} />;
}
