import {
  advanceBulkState,
  bulkJobStatus,
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

export async function notifyBulkWebhook(url: string | null, payload: unknown): Promise<void> {
  if (!url) return;
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return;
  try {
    await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("[bulk] completion webhook failed", error);
  }
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
    const { error: updateError } = await supabase
      .from("bulk_jobs")
      .update({ status: "failed", completed: next.scored.length, results: next })
      .eq("id", job.id);
    if (updateError) {
      console.error("[bulk] stale job update failed", updateError);
      continue;
    }
    failed += 1;
    await notifyBulkWebhook(job.webhook_url, {
      job_id: job.id,
      status: "failed",
      stopped: "stale",
      partial: next.partial,
      completed: next.scored.length,
    });
  }
  return failed;
}

export async function advanceStoredBulkJob(
  supabase: Admin,
  job: StoredJob,
  score: (company: BulkCompanyInput, index: number) => Promise<BulkScoredRow>,
  budgetMs?: number,
): Promise<{ status: "processing" | "completed" | "failed"; state: BulkJobState }> {
  const initial = isBulkState(job.results) ? job.results : freshBulkState([]);
  let next: BulkJobState;
  try {
    next = await runBulkWindow(initial, score, budgetMs);
  } catch (error) {
    console.error("[bulk] job failed", job.id, error);
    next = failBulkState(initial, "error");
  }

  const status = bulkJobStatus(next);
  const { error: updateError } = await supabase
    .from("bulk_jobs")
    .update({ status, completed: next.scored.length, results: next })
    .eq("id", job.id);
  if (updateError) console.error("[bulk] job update failed", updateError);

  if (status !== "processing" && job.status !== status) {
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
  return { status, state: next };
}

export { advanceBulkState, bulkJobStatus, freshBulkState, isBulkState };
