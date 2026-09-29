import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canonicalizeDomain } from "@/lib/score-service";
import { storedScoreFromRow } from "@/lib/stored-score";
import { createSupabaseAdmin } from "@/lib/supabase";

/** Latest stored score for one domain. Read-only: never rescores or charges. */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("domain")?.trim();
  if (!raw) return NextResponse.json({ error: "domain is required" }, { status: 400 });

  let domain: string;
  try {
    domain = canonicalizeDomain(raw);
  } catch {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .eq("domain", domain)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load score" }, { status: 500 });
  const score = storedScoreFromRow(data as Record<string, unknown> | null);
  if (!score) return NextResponse.json({ error: "No stored score for this domain yet", domain }, { status: 404 });
  return NextResponse.json({ score });
}
