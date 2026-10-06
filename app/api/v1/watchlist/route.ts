import { NextRequest, NextResponse } from "next/server";
import { canonicalizeDomain, InvalidDomainError } from "@/lib/score-service";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_WATCHLIST_LIMIT, type DbUser } from "@/lib/types";

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  const { createHash } = await import("crypto");
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("api_keys")
    .select("user_id, is_active")
    .eq("key_hash", keyHash)
    .single();

  return data?.is_active ? data.user_id : null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("score", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  return NextResponse.json({ watchlist: data });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { domain?: unknown; company_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (typeof body?.domain !== "string" || !body.domain.trim()) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }
  const domain = toCanonicalDomain(body.domain);
  if (!domain) return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  const companyName = typeof body.company_name === "string" && body.company_name.trim()
    ? body.company_name.trim()
    : domain;

  const supabase = createSupabaseAdmin();

  // Check watchlist limit for plan
  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  const { count } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  const plan: DbUser["plan"] = user?.plan && user.plan in PLAN_WATCHLIST_LIMIT ? user.plan : "free";
  const limit = PLAN_WATCHLIST_LIMIT[plan]; // null = unlimited
  if (limit !== null && (count ?? 0) >= limit) {
    return NextResponse.json({ error: "Watchlist limit reached for your plan" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .upsert({ user_id: userId, domain, company_name: companyName, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get("domain");
  if (!rawDomain) return NextResponse.json({ error: "domain required" }, { status: 400 });
  const domain = toCanonicalDomain(rawDomain);
  if (!domain) return NextResponse.json({ error: "Invalid domain" }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlist")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("is_active", true)
    .select("domain");

  if (error) return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Domain is not on your watchlist" }, { status: 404 });
  return NextResponse.json({ success: true });
}

/** Canonicalize like /score so "https://Stripe.com/" and "stripe.com" are one entry. */
function toCanonicalDomain(input: string): string | null {
  try {
    return canonicalizeDomain(input);
  } catch (error) {
    if (error instanceof InvalidDomainError) return null;
    throw error;
  }
}
