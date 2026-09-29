import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ScoreView } from "./score-view";
import type { RecentPerson, RecentScore } from "./score-view";

export const metadata = { title: "Score a company" };

export default async function ScorePage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseAdmin();
  let creditsRemaining = 0;
  let recentScores: RecentScore[] = [];
  let recentPeople: RecentPerson[] = [];

  const [userResult, scoresResult, peopleResult] = await Promise.all([
    supabase.from("users").select("credits_remaining").eq("id", userId).single(),
    supabase
      .from("scores")
      .select("domain, company_name, score, score_band, created_at, why_now")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("person_scores")
      .select("id, person_name, person_email, person_company, person_domain, score, score_band, why_now, recommended_action, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (userResult.data) creditsRemaining = userResult.data.credits_remaining;
  if (scoresResult.data) recentScores = scoresResult.data as RecentScore[];
  if (peopleResult.data) recentPeople = peopleResult.data as RecentPerson[];

  return (
    <Suspense>
      <ScoreView creditsRemaining={creditsRemaining} recentScores={recentScores} recentPeople={recentPeople} />
    </Suspense>
  );
}
