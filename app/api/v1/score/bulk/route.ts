import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { BulkScoreRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as BulkScoreRequest;

  if (!body.companies || body.companies.length === 0) {
    return NextResponse.json({ error: "No companies provided" }, { status: 400 });
  }
  if (body.companies.length > 1000) {
    return NextResponse.json({ error: "Max 1,000 companies per job" }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
    }
    userId = keyRow.user_id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // ── Credit check ────────────────────────────────────────────────────────────
  const { data: user } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", userId)
    .single();

  if (!user || user.credits_remaining < body.companies.length) {
    return NextResponse.json(
      { error: `Insufficient credits. Need ${body.companies.length}, have ${user?.credits_remaining ?? 0}` },
      { status: 402 }
    );
  }

  // ── Check concurrent job limit (max 3) ──────────────────────────────────────
  const { count } = await supabase
    .from("bulk_jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["queued", "processing"]);

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Max 3 concurrent bulk jobs allowed" },
      { status: 429 }
    );
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
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
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
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
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
      return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
    }
    userId = keyRow.user_id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // ── Fetch job with user_id filter ───────────────────────────────────────────
  const { data: job } = await supabase
    .from("bulk_jobs")
    .select("id, status, total, completed, results, created_at")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}
