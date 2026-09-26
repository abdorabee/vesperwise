import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PeopleView } from "./people-view";
import type { DbPersonScore } from "@/lib/types";

export const metadata = { title: "People scoring" };

export default async function PeoplePage() {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = createSupabaseAdmin();

  const [
    { count: totalCount },
    { count: hotCount },
    { data: scores },
  ] = await Promise.all([
    supabase.from("person_scores").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("person_scores").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("score_band", "HOT"),
    supabase.from("person_scores").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <PeopleView
      totalCount={totalCount ?? 0}
      hotCount={hotCount ?? 0}
      initialScores={(scores ?? []) as DbPersonScore[]}
    />
  );
}
