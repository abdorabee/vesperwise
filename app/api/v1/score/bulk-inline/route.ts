import { parseCsvRecords } from "@/lib/csv-parse";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { redactPublicSources } from "@/lib/public-source";
import { canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import {
  scoreCompany,
  domainToCompanyName,
  canonicalizeDomain,
  scoringProfileHash,
  InsufficientCreditsError,
  InvalidDomainError,
} from "@/lib/score-service";
import { cacheGet, scoreResultCacheKey } from "@/lib/cache";
import { getActiveScoringVersion } from "@/lib/scorer";
import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import {
  bulkInlineBatchKey,
  bulkInlineRowIdempotencyKey,
  bulkInlineRowSignature,
} from "@/lib/bulk-inline";
import type { BusinessProfile } from "@/lib/types";

const MAX_ROWS = 50;

function rowDomain(row: { domain?: string; company?: string }): string {
  const rawDomain = (row.domain ?? "").trim();
  const rawCompany = (row.company ?? "").trim();
  return rawDomain || `${rawCompany.toLowerCase().replace(/\s+/g, "")}.com`;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { status: 400 },
    );
  }

  const sampleRow = rows[0];
  if (!sampleRow.domain && !sampleRow.company) {
    return NextResponse.json(
      { error: "CSV must have a 'domain' or 'company' column" },
      { status: 400 },
    );
  }

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
  const businessProfile = (user.business_profile as BusinessProfile) ?? null;
  const productCategory = user.product_category ?? "B2B SaaS";
  const profileHash = scoringProfileHash(productCategory, businessProfile);
  const scoringVersion = getActiveScoringVersion();
  const estimateOnly = formData.get("estimate") === "1";

  const prepared: Array<{ index: number; domain: string; companyName: string; fresh: boolean }> = [];
  for (let i = 0; i < rows.length; i++) {
    const rawCompany = (rows[i].company ?? "").trim();
    let domain = rowDomain(rows[i]);
    try {
      domain = canonicalizeDomain(domain);
    } catch (error) {
      if (!(error instanceof InvalidDomainError)) throw error;
    }
    const cacheKey = scoreResultCacheKey(userId, domain, profileHash, scoringVersion);
    const cached = await cacheGet(cacheKey);
    prepared.push({
      index: i,
      domain,
      companyName: rawCompany || domainToCompanyName(domain),
      fresh: !cached,
    });
  }

  const estimatedFresh = prepared.filter((row) => row.fresh).length;
  const estimatedCached = prepared.length - estimatedFresh;
  const creditsRemaining = user.credits_remaining ?? 0;
  const estimate = {
    estimated_fresh: estimatedFresh,
    estimated_cached: estimatedCached,
    credits_needed: estimatedFresh,
    credits_remaining: creditsRemaining,
    total_rows: rows.length,
  };

  if (!skipCredits && estimatedFresh > creditsRemaining) {
    return NextResponse.json({ error: "Insufficient credits", ...estimate }, { status: 402 });
  }
  if (estimateOnly) {
    return NextResponse.json(estimate);
  }

  const batchKey = bulkInlineBatchKey(
    req.headers.get("idempotency-key"),
    bulkInlineRowSignature(prepared.map((row) => row.domain)),
  );

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

  for (const row of prepared) {
    try {
      const result = await scoreCompany({
        domain: row.domain,
        userId,
        companyName: row.companyName,
        productCategory,
        businessProfile,
        skipCredits,
        idempotencyKey: bulkInlineRowIdempotencyKey(userId, batchKey, row.index),
      });

      if (
        result.score_status === "unscorable" ||
        result.intent_score === null ||
        result.score_band === null
      ) {
        errors.push({
          domain: row.domain,
          error: `Insufficient data coverage (${Math.round(result.data_coverage * 100)}%)`,
        });
        continue;
      }

      results.push({
        domain: result.domain ?? row.domain,
        company_name: result.company ?? row.companyName,
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
        errors.push({ domain: row.domain, error: "Insufficient credits" });
        break;
      }
      console.error(`[bulk-inline] failed to score ${row.domain}:`, err);
      errors.push({ domain: row.domain, error: (err as Error).message });
    }

    if (process.env.NODE_ENV !== "test" && row.index < rows.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

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
    credits_remaining: balance?.credits_remaining ?? creditsRemaining,
    estimated_fresh: estimate.estimated_fresh,
    estimated_cached: estimate.estimated_cached,
    credits_needed: estimate.credits_needed,
    credits_charged: results.filter((row) => row.charged).length,
  });
}
