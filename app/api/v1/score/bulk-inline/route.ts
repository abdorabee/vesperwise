import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { scoreCompany, domainToCompanyName } from "@/lib/score-service";
import { BULK_INLINE_MAX_ROWS } from "@/lib/types";

const MAX_ROWS = BULK_INLINE_MAX_ROWS;

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse CSV ─────────────────────────────────────────────────────────────
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "CSV file required (field: file)" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_ROWS} companies per batch. Your file has ${rows.length} rows.` },
      { status: 400 }
    );
  }

  // Check that CSV has a domain or company column
  const sampleRow = rows[0];
  if (!sampleRow.domain && !sampleRow.company) {
    return NextResponse.json(
      { error: "CSV must have a 'domain' or 'company' column" },
      { status: 400 }
    );
  }

  // ── Seller profile ────────────────────────────────────────────────────────
  // Individual score runs reserve credits atomically. Avoid pre-charging or
  // requiring one credit per CSV row because personalized cache hits are free.
  const skipCredits = process.env.DISABLE_CREDIT_CHECK === "true";
  const supabase = createSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("product_category, business_profile")
    .eq("id", userId)
    .single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const businessProfile = (user.business_profile as import("@/lib/types").BusinessProfile) ?? null;

  // ── Score each company sequentially ────────────────────────────────────────
  const results: Array<{
    domain: string;
    company_name: string;
    intent_score: number;
    score_band: string;
    buying_stage: string;
    urgency: string;
    ai_summary: string;
    why_now: string;
    recommended_action: string;
    key_triggers: string[];
    email_subject: string;
    talk_track: string;
    signals: import("@/lib/types").SignalSet;
    score_status: "complete" | "partial";
    data_coverage: number;
    icp_fit_score: number | null;
    cached: boolean;
    charged: boolean;
    last_updated: string;
  }> = [];

  const errors: Array<{ domain: string; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDomain = (row.domain ?? "").trim();
    const rawCompany = (row.company ?? "").trim();
    const domain = rawDomain || `${rawCompany.toLowerCase().replace(/\s+/g, "")}.com`;
    const companyName = rawCompany || domainToCompanyName(domain);

    try {
      const result = await scoreCompany({
        domain,
        userId,
        companyName,
        productCategory: user.product_category ?? "B2B SaaS",
        businessProfile,
        skipCredits,
      });

      if (
        result.score_status === "unscorable" ||
        result.intent_score === null ||
        result.score_band === null
      ) {
        errors.push({
          domain,
          error: `Insufficient data coverage (${Math.round(result.data_coverage * 100)}%)`,
        });
        continue;
      }

      results.push({
        domain: result.domain ?? domain,
        company_name: result.company ?? companyName,
        intent_score: result.intent_score,
        score_band: result.score_band,
        buying_stage: result.buying_stage ?? "",
        urgency: result.urgency ?? "",
        ai_summary: result.ai_summary ?? "",
        why_now: result.why_now ?? "",
        recommended_action: result.recommended_action ?? "",
        key_triggers: result.key_triggers ?? [],
        email_subject: result.email_subject ?? "",
        talk_track: result.talk_track ?? "",
        signals: result.signals,
        score_status: result.score_status,
        data_coverage: result.data_coverage,
        icp_fit_score: result.icp_fit_score,
        cached: result.cached,
        charged: result.charged,
        last_updated: result.last_updated ?? new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[bulk-inline] failed to score ${domain}:`, err);
      errors.push({ domain, error: (err as Error).message });
    }

    // Throttle between companies to respect OpenRouter free-tier rate limits (~20 req/min)
    if (i < rows.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.intent_score - a.intent_score);

  return NextResponse.json({
    total: rows.length,
    scored: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    });
}
