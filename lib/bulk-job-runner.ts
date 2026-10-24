import { randomUUID } from "node:crypto";
import {
  bulkJobStatus,
  bulkScoreIdempotencyKey,
  failBulkState,
  freshBulkState,
  isBulkJobStale,
  isBulkState,
  runBulkWindow,
  type BulkCompanyInput,
  type BulkJobState,
  type BulkScoredRow,
} from "@/lib/bulk-job";
import { createSupabaseAdmin } from "@/lib/supabase";
import { postBulkWebhook, webhookUrlError } from "@/lib/webhook-url";

type Admin = ReturnType<typeof createSupabaseAdmin>;

interface StoredJob {
  id: string;
  status: string;
  created_at: string;
  webhook_url: string | null;
  results: unknown;
  total?: number;
  completed?: number;
}

const BULK_LEASE_SECONDS = 120;

export async function notifyBulkWebhook(url: string | null, payload: unknown): Promise<void> {
  if (!url) return;
  try {
    await postBulkWebhook(url, payload);
  } catch (error) {
    console.error("[bulk] completion webhook failed", error);
  }
}

export async function assertPublicWebhookUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  return webhookUrlError(url);
}

async function claimBulkJob(supabase: Admin, jobId: string, token: string): Promise<StoredJob | null> {
  const { data, error } = await supabase.rpc("claim_bulk_job", {
    p_job_id: jobId,
    p_token: token,
    p_lease_seconds: BULK_LEASE_SECONDS,
  });
  if (error) {
    console.error("[bulk] claim failed", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? row as StoredJob : null;
}

async function markWebhookSent(supabase: Admin, jobId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("mark_bulk_webhook_sent", { p_job_id: jobId });
  if (error) {
    console.error("[bulk] webhook claim failed", error);
    return false;
  }
  return data === true;
}

export async function sweepStaleBulkJobs(supabase: Admin, now = Date.now()): Promise<number> {
  const { data, error } = await supabase
    .from("bulk_jobs")
    .select("id, status, created_at, results, webhook_url")
    .in("status", ["queued", "processing"]);
  if (error) {
    console.error("[bulk] stale sweep failed", error);
    return 0;
  }

  let failed = 0;
  for (const job of (data ?? []) as StoredJob[]) {
    const state = isBulkState(job.results) ? job.results : null;
    if (!isBulkJobStale(job.created_at, state, now)) continue;
    const next = failBulkState(state ?? freshBulkState([]), "stale", new Date(now));
    const { data: saved, error: updateError } = await supabase
      .from("bulk_jobs")
      .update({ status: "failed", completed: next.scored.length, results: next })
      .eq("id", job.id)
      .in("status", ["queued", "processing"])
      .select("id")
      .maybeSingle();
    if (updateError) {
      console.error("[bulk] stale job update failed", updateError);
      continue;
    }
    if (!saved) continue;
    failed += 1;
    if (await markWebhookSent(supabase, job.id)) {
      await notifyBulkWebhook(job.webhook_url, {
        job_id: job.id,
        status: "failed",
        stopped: "stale",
        partial: next.partial,
        completed: next.scored.length,
      });
    }
  }
  return failed;
}

export async function advanceStoredBulkJob(
  supabase: Admin,
  job: StoredJob,
  score: (company: BulkCompanyInput, index: number, idempotencyKey: string) => Promise<BulkScoredRow>,
  budgetMs?: number,
): Promise<{ status: "processing" | "completed" | "failed"; state: BulkJobState; claimed: boolean }> {
  const token = randomUUID();
  const claimed = await claimBulkJob(supabase, job.id, token);
  const initial = isBulkState(job.results) ? job.results : freshBulkState([]);
  if (!claimed) {
    return { status: bulkJobStatus(initial), state: initial, claimed: false };
  }

  const claimedState = isBulkState(claimed.results) ? claimed.results : initial;
  let next: BulkJobState;
  try {
    next = await runBulkWindow(
      claimedState,
      (company, index) => score(company, index, bulkScoreIdempotencyKey(job.id, index)),
      budgetMs,
    );
  } catch (error) {
    console.error("[bulk] job failed", job.id, error);
    next = failBulkState(claimedState, "error");
  }

  const status = bulkJobStatus(next);
  const { data: saved, error: updateError } = await supabase
    .from("bulk_jobs")
    .update({ status, completed: next.scored.length, results: next })
    .eq("id", job.id)
    .eq("lease_token", token)
    .select("id")
    .maybeSingle();
  if (updateError) console.error("[bulk] job update failed", updateError);

  if (saved && status !== "processing") {
    const shouldSend = await markWebhookSent(supabase, job.id);
    if (shouldSend) {
      await notifyBulkWebhook(job.webhook_url, {
        job_id: job.id,
        status,
        completed: next.scored.length,
        total: next.companies.length,
        credits_charged: next.credits_charged,
        stopped: next.stopped,
        partial: next.partial,
      });
    }
  }
  return { status, state: next, claimed: true };
}

export { bulkJobStatus, freshBulkState, isBulkState };
