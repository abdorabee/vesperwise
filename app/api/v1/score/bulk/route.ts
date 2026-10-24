import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { runBulkScores } from "@/lib/bulk-runner";
import { canUseFeature, featureDeniedMessage, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { redactPublicSources } from "@/lib/public-source";
import { domainToCompanyName, scoreCompany } from "@/lib/score-service";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { BulkScoreRequest, BusinessProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BulkScoreRequest;

  if (!body.companies || body.companies.length === 0) {
    return errorResponse(400, "invalid_request", "No companies provided");
  }
  if (body.companies.length > 1000) {
    return errorResponse(400, "invalid_request", "Max 1,000 companies per job");
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const supabase = createSupabaseAdmin();
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const { createHash } = await import("crypto");
    const keyHash = createHash("sha256").update(apiKey).digest("hex");

    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .single();

    if (!keyRow?.is_active) {
      return errorResponse(401, "unauthorized", "Invalid or inactive API key");
    }
    userId = keyRow.user_id;
  }

  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required");
  }

  const { data: user } = await supabase
    .from("users")
    .select("plan, product_category, business_profile")
    .eq("id", userId)
    .single();

  const plan = parsePlan(user?.plan);
  if (!canUseFeature(plan, "bulk")) {
    return errorResponse(403, "plan_feature_required", featureDeniedMessage(plan, "bulk"), {
      upgrade_to: requiredPlanFor("bulk"),
    });
  }

  // ── Check concurrent job limit (max 3) ──────────────────────────────────────
  const { count } = await supabase
    .from("bulk_jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["queued", "processing"]);

  if ((count ?? 0) >= 3) {
    return errorResponse(429, "too_many_jobs", "Max 3 concurrent bulk jobs allowed");
  }

  // ── Create job ───────────────────────────────────────────────────────────────
  const { data: job, error } = await supabase
    .from("bulk_jobs")
    .insert({
      user_id: userId,
      status: "queued",
      total: body.companies.length,
      completed: 0,
      webhook_url: body.webhook_url ?? null,
      results: null,
    })
    .select()
    .single();

  if (error || !job) {
    return errorResponse(500, "internal_error", "Failed to create job");
  }

  const businessProfile = (user?.business_profile as BusinessProfile | null) ?? null;
  const summary = await runBulkScores(body.companies, async (company) => {
    const row = company as { domain?: string; name?: string };
    const rawDomain = (row.domain ?? "").trim();
    const rawName = (row.name ?? "").trim();
    const domain = rawDomain || `${rawName.toLowerCase().replace(/\s+/g, "")}.com`;
    const result = await scoreCompany({
      domain,
      userId,
      companyName: rawName || domainToCompanyName(domain),
      productCategory: user?.product_category ?? "B2B SaaS",
      businessProfile,
    });
    return {
      domain: result.domain,
      company_name: result.company,
      intent_score: result.intent_score,
      score_band: result.score_band,
      cached: result.cached,
      charged: result.charged,
    };
  });

  const status = summary.stopped && summary.results.length === 0 ? "failed" : "completed";
  await supabase
    .from("bulk_jobs")
    .update({
      status,
      completed: summary.results.length,
      results: redactPublicSources({
        scored: summary.results,
        errors: summary.errors,
        stopped: summary.stopped ? "insufficient_credits" : null,
        credits_charged: summary.charged,
      }),
    })
    .eq("id", job.id)
    .eq("user_id", userId);

  return NextResponse.json({
    job_id: job.id,
    estimated_seconds: body.companies.length * 4,
    completed: summary.results.length,
    credits_charged: summary.charged,
    stopped: summary.stopped ? "insufficient_credits" : null,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId) {
    return errorResponse(400, "invalid_request", "job_id required");
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const supabase = createSupabaseAdmin();
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const { createHash } = await import("crypto");
    const keyHash = createHash("sha256").update(apiKey).digest("hex");

    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .single();

    if (!keyRow?.is_active) {
      return errorResponse(401, "unauthorized", "Invalid or inactive API key");
    }
    userId = keyRow.user_id;
  }

  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication required");
  }

  // ── Fetch job with user_id filter ───────────────────────────────────────────
  const { data: job } = await supabase
    .from("bulk_jobs")
    .select("id, status, total, completed, results, created_at")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (!job) return errorResponse(404, "not_found", "Job not found");
  return NextResponse.json(redactPublicSources(job));
}
