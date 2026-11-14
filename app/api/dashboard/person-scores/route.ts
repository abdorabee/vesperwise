import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sanitizeSearch } from "@/lib/search-sanitize";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = sanitizeSearch(searchParams.get("q") ?? "");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createSupabaseAdmin();

  let dbQuery = supabase
    .from("person_scores")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    dbQuery = dbQuery.or(
      `person_name.ilike.%${query}%,person_email.ilike.%${query}%,person_company.ilike.%${query}%`
    );
  }

  const { data: scores, count, error } = await dbQuery;

  if (error) {
    console.error("[person-scores] error:", error);
    return NextResponse.json({ error: "Failed to fetch person scores" }, { status: 500 });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ scores: scores ?? [], total, page, totalPages });
}
