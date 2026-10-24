import { parseCsvRecords } from "@/lib/csv-parse";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { redactPublicSources } from "@/lib/public-source";
import { canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { scoreCompany, domainToCompanyName, InsufficientCreditsError } from "@/lib/score-service";
import { cacheGet } from "@/lib/cache";
import { scoreResultCacheKey } from "@/lib/score-service";
import { getProfileHash } from "@/lib/business-profile";
import { getActiveScoringVersion } from "@/lib/scoring-version";
import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import { randomUUID } from "crypto";

const MAX_ROWS = 50;

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
  const rows = parseCsvRecords(text);

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
  const skipCredits = isDevCreditBypassEnabled();
  const supabase = createSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("plan, product_category, business_profile, credits_remaining")
    .eq("id", userId)
    .single();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const plan = parsePlan(user.plan);
  if (!canUseFeature(plan, "bulk") || !canUseFeature(plan, "csv")) {
    const feature = canUseFeature(plan, "csv") ? "bulk" : "csv";
    return NextResponse.json(
      { error: featureDeniedMessage(plan, feature), upgrade_to: requiredPlanFor(feature) },
      { status: 403 },
    );
  }
  const businessProfile = (user.business_profile as import("@/lib/types").BusinessProfile) ?? null;

  // ── Cost estimate: check cache to estimate fresh vs cached ─────────────────
  const batchId = randomUUID();
  const scoringVersion = getActiveScoringVersion();
  const profileHash = getProfileHash(
    user.product_category ?? "B2B SaaS",
    businessProfile,
  );

  let estimatedFresh = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDomain = (row.domain ?? "").trim();
    const rawCompany = (row.company ?? "").trim();
    const domain = rawDomain || `${rawCompany.toLowerCase().replace(/\s+/g, "")}.com`;
    
    const cacheKey = scoreResultCacheKey(userId, domain, profileHash, scoringVersion);
    const cached = await cacheGet(cacheKey);
    if (!cached) estimatedFresh += 1;
  }

  const creditsRemaining = user.credits_remaining ?? 0;
  if (!skipCredits && estimatedFresh > creditsRemaining) {
    return NextResponse.json(
      {
        error: "Insufficient credits",
        estimated_fresh: estimatedFresh,
        credits_needed: estimatedFresh,
        credits_remaining: creditsRemaining,
        total_rows: rows.length,
      },
      { status: 402 },
    );
  }

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
        idempotencyKey: `bulk-inline:${userId}:${batchId}:${i}`,
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
        signals: redactPublicSources(result.signals),
        score_status: result.score_status,
        data_coverage: result.data_coverage,
        icp_fit_score: result.icp_fit_score,
        cached: result.cached,
        charged: result.charged,
        last_updated: result.last_updated ?? new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        errors.push({ domain, error: "Insufficient credits" });
        break;
      }
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

  const { data: balance } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.json({
    total: rows.length,
    scored: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
    credits_remaining: balance?.credits_remaining ?? null,
  });
}
