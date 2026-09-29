import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_LIMIT = 20;
const RANGE_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const BANDS = new Set(["HOT", "WARM", "COLD"]);

/** PostgREST `or()` filters are comma/paren delimited; keep search input literal. */
function sanitizeSearch(value: string) {
  return value.replace(/[,()%*\\]/g, " ").trim().slice(0, 100);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = sanitizeSearch(searchParams.get("q") ?? "");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const bandParam = searchParams.get("band")?.toUpperCase() ?? "";
  const band = BANDS.has(bandParam) ? bandParam : null;
  const rangeDays = RANGE_DAYS[searchParams.get("range")?.toLowerCase() ?? ""] ?? null;
  const since = rangeDays ? new Date(Date.now() - rangeDays * 86_400_000).toISOString() : null;
  const sort = searchParams.get("sort") === "score" ? "score" : "newest";
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createSupabaseAdmin();

  let countQuery = supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  let query = supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId);

  if (q) {
    countQuery = countQuery.or(`company_name.ilike.%${q}%,domain.ilike.%${q}%`);
    query = query.or(`company_name.ilike.%${q}%,domain.ilike.%${q}%`);
  }
  if (band) {
    countQuery = countQuery.eq("score_band", band);
    query = query.eq("score_band", band);
  }
  if (since) {
    countQuery = countQuery.gte("created_at", since);
    query = query.gte("created_at", since);
  }
  if (sort === "score") query = query.order("score", { ascending: false });
  query = query.order("created_at", { ascending: false }).range(from, to);

  const [{ count }, { data, error }] = await Promise.all([countQuery, query]);
  if (error) return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  const total = count ?? 0;

  return NextResponse.json({
    scores: data ?? [],
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
