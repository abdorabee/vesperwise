import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_WATCHLIST_LIMIT } from "@/lib/types";
import { watchlistScoreFields } from "@/lib/watchlist-seed";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("score", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  return NextResponse.json({ watchlist: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain, company_name } = (await req.json()) as { domain: string; company_name?: string };
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const normalizedDomain = domain.toLowerCase();

  const [{ data: user }, { count }, { data: latestScore }] = await Promise.all([
    supabase.from("users").select("plan").eq("id", userId).single(),
    supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
    supabase
      .from("scores")
      .select("score, score_band, created_at")
      .eq("user_id", userId)
      .eq("domain", normalizedDomain)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const plan = (user?.plan ?? "free") as keyof typeof PLAN_WATCHLIST_LIMIT;
  const limit = PLAN_WATCHLIST_LIMIT[plan];
  if (limit !== null && (count ?? 0) >= limit) {
    return NextResponse.json({ error: `Watchlist limit (${limit}) reached for your plan` }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .upsert(
      {
        user_id: userId,
        domain: normalizedDomain,
        company_name: company_name ?? domain,
        is_active: true,
        ...watchlistScoreFields(latestScore),
      },
      { onConflict: "user_id,domain" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  await supabase
    .from("watchlist")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("domain", domain.toLowerCase());

  return NextResponse.json({ success: true });
}
