import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { SearchResultItem } from "@/lib/dashboard-search";
import { sanitizeSearch } from "@/lib/search-sanitize";

/** Score rows scanned before collapsing re-scores of the same domain into one result. */
const SCORE_ROWS_SCANNED = 25;

/** Rows arrive newest first; keep the first row per domain, up to `max`. */
function latestPerDomain<T extends { domain: string }>(rows: readonly T[], max: number): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.domain)) return false;
    seen.add(row.domain);
    return true;
  }).slice(0, max);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = sanitizeSearch(req.nextUrl.searchParams.get("q") ?? "");
  if (q.length < 2) {
    return NextResponse.json({ companies: [], people: [], watchlist: [], lists: [] });
  }

  const supabase = createSupabaseAdmin();
  const limit = 5;

  const [scoresRes, peopleRes, watchlistRes, listsRes] = await Promise.all([
    supabase
      .from("scores")
      .select("id, domain, company_name, score, score_band")
      .eq("user_id", userId)
      .or(`company_name.ilike.%${q}%,domain.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(SCORE_ROWS_SCANNED),
    supabase
      .from("person_scores")
      .select("id, person_name, person_email, person_company, score_band")
      .eq("user_id", userId)
      .or(`person_name.ilike.%${q}%,person_email.ilike.%${q}%,person_company.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("watchlist")
      .select("id, domain, company_name, score, score_band")
      .eq("user_id", userId)
      .eq("is_active", true)
      .or(`company_name.ilike.%${q}%,domain.ilike.%${q}%`)
      .order("score", { ascending: false })
      .limit(limit),
    supabase
      .from("lists")
      .select("id, name, description, list_type")
      .eq("user_id", userId)
      .ilike("name", `%${q}%`)
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  const companies: SearchResultItem[] = latestPerDomain(scoresRes.data ?? [], limit).map((row) => ({
    id: `score-${row.id}`,
    kind: "company",
    label: row.company_name || row.domain,
    sublabel: row.domain,
    // Opens the stored result; a fresh score is the user's explicit choice on the page.
    href: `/score?domain=${encodeURIComponent(row.domain)}&view=last`,
    meta: row.score != null ? String(row.score) : undefined,
    band: row.score_band as SearchResultItem["band"],
  }));

  const people: SearchResultItem[] = (peopleRes.data ?? []).map((row) => ({
    id: `person-${row.id}`,
    kind: "person",
    label: row.person_name || row.person_email || "Unknown",
    sublabel: [row.person_company, row.person_email].filter(Boolean).join(" · "),
    href: `/people?q=${encodeURIComponent(row.person_name || row.person_email || "")}`,
    band: row.score_band as SearchResultItem["band"],
  }));

  const watchlist: SearchResultItem[] = (watchlistRes.data ?? []).map((row) => ({
    id: `watch-${row.id}`,
    kind: "watchlist",
    label: row.company_name || row.domain,
    sublabel: row.domain,
    href: `/watchlist?q=${encodeURIComponent(row.domain)}`,
    meta: row.score != null ? String(row.score) : undefined,
    band: row.score_band as SearchResultItem["band"],
  }));

  const lists: SearchResultItem[] = (listsRes.data ?? []).map((row) => ({
    id: `list-${row.id}`,
    kind: "list",
    label: row.name,
    sublabel: row.description || row.list_type,
    href: `/lists/${row.id}`,
  }));

  return NextResponse.json({ companies, people, watchlist, lists });
}
