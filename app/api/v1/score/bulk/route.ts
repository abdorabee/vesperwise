import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { BulkScoreRequest } from "@/lib/types";

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

  // ── Credit check ────────────────────────────────────────────────────────────
  const { data: user } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", userId)
    .single();

  if (!user || user.credits_remaining < body.companies.length) {
    return errorResponse(402, "insufficient_credits", `Insufficient credits. Need ${body.companies.length}, have ${user?.credits_remaining ?? 0}`);
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

  // TODO: Hand off to the bulk scoring processor.
  // await bulkQueue.add('score-bulk', { jobId: job.id, companies: body.companies, userId });

  return NextResponse.json({
    job_id: job.id,
    estimated_seconds: body.companies.length * 4,
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
  return NextResponse.json(job);
}
