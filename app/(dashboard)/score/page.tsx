import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { dedupeByDomain } from "@/components/score/recent-scores";
import { ScoreView } from "./score-view";
import type { RecentScore } from "./score-view";

const RECENT_SCORES_SHOWN = 6;
// Over-fetch so repeat scores of one domain cannot crowd distinct domains out of the list.
const RECENT_SCORES_FETCHED = 40;

export const metadata = { title: "Score a company" };

export default async function ScorePage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseAdmin();
  let creditsRemaining = 0;
  let recentScores: RecentScore[] = [];

  const [userResult, scoresResult] = await Promise.all([
    supabase.from("users").select("credits_remaining, onboarding_completed").eq("id", userId).single(),
    supabase
      .from("scores")
      .select("domain, company_name, score, score_band, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_SCORES_FETCHED),
  ]);

  if (userResult.data) creditsRemaining = userResult.data.credits_remaining;
  if (scoresResult.data) recentScores = dedupeByDomain(scoresResult.data as RecentScore[], RECENT_SCORES_SHOWN);

  return <ScoreView creditsRemaining={creditsRemaining} recentScores={recentScores} onboardingComplete={userResult.data?.onboarding_completed === true} />;
}
