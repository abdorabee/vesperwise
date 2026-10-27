import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import {
  advanceStoredBulkJob,
  assertPublicWebhookUrl,
  freshBulkState,
  isBulkState,
  retryStoredBulkWebhook,
  sweepStaleBulkJobs,
} from "@/lib/bulk-job-runner";
import { bulkScoreIdempotencyKey, type BulkCompanyInput, type BulkScoredRow } from "@/lib/bulk-job";
import { BULK_MAX_CONCURRENT, BULK_MAX_PER_JOB, canUseFeature, featureDeniedMessage, formatCount, parsePlan, requiredPlanFor } from "@/lib/plan-features";
import { redactPublicSources } from "@/lib/public-source";
import { domainToCompanyName, scoreCompany } from "@/lib/score-service";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { BulkScoreRequest, BusinessProfile } from "@/lib/types";

export const maxDuration = 60;

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const supabase = createSupabaseAdmin();
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(401, "unauthorized", "Authentication required");
  }

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
  return { supabase, userId: keyRow.user_id as string };
}

async function creditsRemaining(supabase: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const { data } = await supabase.from("users").select("credits_remaining").eq("id", userId).maybeSingle();
  const value = data?.credits_remaining;
  return typeof value === "number" ? value : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BulkScoreRequest;

  if (!body.companies || body.companies.length === 0) {
    return errorResponse(400, "invalid_request", "No companies provided");
  }
  if (body.companies.length > BULK_MAX_PER_JOB) {
    return errorResponse(400, "invalid_request", `Max ${formatCount(BULK_MAX_PER_JOB)} companies per job`);
  }

  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, userId } = authResult;

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

  await sweepStaleBulkJobs(supabase);

  const { count } = await supabase
    .from("bulk_jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["queued", "processing"]);

  if ((count ?? 0) >= BULK_MAX_CONCURRENT) {
    return errorResponse(429, "too_many_jobs", `Max ${BULK_MAX_CONCURRENT} concurrent bulk jobs allowed`);
  }

  const webhookError = await assertPublicWebhookUrl(body.webhook_url);
  if (webhookError) {
    return errorResponse(400, "invalid_request", webhookError, { field: "webhook_url" });
  }

  const state = freshBulkState(body.companies);
  const { data: job, error } = await supabase
    .from("bulk_jobs")
    .insert({
      user_id: userId,
      status: "processing",
      total: body.companies.length,
      completed: 0,
      webhook_url: body.webhook_url ?? null,
      results: state,
    })
    .select()
    .single();

  if (error || !job) {
    return errorResponse(500, "internal_error", "Failed to create job");
  }

  const businessProfile = (user?.business_profile as BusinessProfile | null) ?? null;
  const score = async (company: BulkCompanyInput, index: number): Promise<BulkScoredRow> => {
    const rawDomain = (company.domain ?? "").trim();
    const rawName = (company.name ?? "").trim();
    const domain = rawDomain || `${rawName.toLowerCase().replace(/\s+/g, "")}.com`;
    const result = await scoreCompany({
      domain,
      userId,
      companyName: rawName || domainToCompanyName(domain),
      productCategory: user?.product_category ?? "B2B SaaS",
      businessProfile,
      idempotencyKey: bulkScoreIdempotencyKey(job.id, index),
    });
    return {
      domain: result.domain,
      company_name: result.company,
      intent_score: result.intent_score,
      score_band: result.score_band,
      cached: result.cached,
      charged: result.charged,
    };
  };

  const advanced = await advanceStoredBulkJob(supabase, job, score);
  return NextResponse.json({
    job_id: job.id,
    status: advanced.status,
    estimated_seconds: body.companies.length * 4,
    completed: advanced.state.scored.length,
    credits_charged: advanced.state.credits_charged,
    credits_remaining: await creditsRemaining(supabase, userId),
    stopped: advanced.state.stopped,
    partial: advanced.state.partial,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId) {
    return errorResponse(400, "invalid_request", "job_id required");
  }

  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const { supabase, userId } = authResult;

  const webhookAttempts = new Set<string>();
  await sweepStaleBulkJobs(supabase, Date.now(), webhookAttempts);

  const { data: job } = await supabase
    .from("bulk_jobs")
    .select("id, status, total, completed, results, created_at, webhook_url, user_id")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (!job) return errorResponse(404, "not_found", "Job not found");

  if (job.status === "processing" && isBulkState(job.results)) {
    const { data: user } = await supabase
      .from("users")
      .select("plan, product_category, business_profile")
      .eq("id", userId)
      .single();
    const businessProfile = (user?.business_profile as BusinessProfile | null) ?? null;
    const advanced = await advanceStoredBulkJob(supabase, job, async (company, index) => {
      const rawDomain = (company.domain ?? "").trim();
      const rawName = (company.name ?? "").trim();
      const domain = rawDomain || `${rawName.toLowerCase().replace(/\s+/g, "")}.com`;
      const result = await scoreCompany({
        domain,
        userId,
        companyName: rawName || domainToCompanyName(domain),
        productCategory: user?.product_category ?? "B2B SaaS",
        businessProfile,
        idempotencyKey: bulkScoreIdempotencyKey(job.id, index),
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
    return NextResponse.json(redactPublicSources({
      id: job.id,
      status: advanced.status,
      total: job.total,
      completed: advanced.state.scored.length,
      results: advanced.state,
      created_at: job.created_at,
      credits_remaining: await creditsRemaining(supabase, userId),
    }));
  }

  if (job.status === "completed" || job.status === "failed") {
    await retryStoredBulkWebhook(supabase, job, webhookAttempts);
  }

  return NextResponse.json(redactPublicSources(job));
}
