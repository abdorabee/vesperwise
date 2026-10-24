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
import { postBulkWebhook, WebhookDeliveryError, webhookUrlError, type WebhookSendOptions } from "@/lib/webhook-url";

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
export const WEBHOOK_ATTEMPT_CAP = 3;
const WEBHOOK_ATTEMPT_LEASE_SECONDS = 15;

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

function webhookPayload(job: StoredJob) {
  const state = isBulkState(job.results) ? job.results : null;
  return {
    job_id: job.id,
    status: job.status,
    completed: state?.scored.length ?? job.completed ?? 0,
    total: state?.companies.length ?? job.total ?? 0,
    credits_charged: state?.credits_charged ?? 0,
    stopped: state?.stopped ?? null,
    partial: state?.partial ?? false,
  };
}

async function claimWebhookAttempt(supabase: Admin, jobId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("claim_bulk_webhook_attempt", {
    p_job_id: jobId,
    p_max_attempts: WEBHOOK_ATTEMPT_CAP,
    p_lease_seconds: WEBHOOK_ATTEMPT_LEASE_SECONDS,
  });
  if (error) {
    console.error("[bulk] webhook attempt claim failed", error);
    return null;
  }
  return typeof data === "number" ? data : null;
}

async function releaseWebhookAttempt(supabase: Admin, jobId: string): Promise<void> {
  const { error } = await supabase.rpc("release_bulk_webhook_attempt", { p_job_id: jobId });
  if (error) console.error("[bulk] webhook attempt release failed", error);
}

async function giveUpExhaustedWebhook(supabase: Admin, jobId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("give_up_bulk_webhook", {
    p_job_id: jobId,
    p_max_attempts: WEBHOOK_ATTEMPT_CAP,
  });
  if (error) {
    console.error("[bulk] webhook give-up failed", error);
    return false;
  }
  return data === true;
}

/**
 * Send the completion callback once. Transport failures leave webhook_sent_at
 * unset so the next poll or sweep can retry, up to WEBHOOK_ATTEMPT_CAP.
 * The flag is set only after a successful POST, a permanent URL rejection,
 * or a logged give-up at the cap. Callers must persist the job first.
 */
export async function retryStoredBulkWebhook(
  supabase: Admin,
  job: StoredJob,
  attempted: Set<string> = new Set(),
  timing?: WebhookSendOptions,
): Promise<void> {
  if (!job.webhook_url) return;
  if (job.status !== "completed" && job.status !== "failed") return;
  if (attempted.has(job.id)) return;
  attempted.add(job.id);

  try {
    const attempt = await claimWebhookAttempt(supabase, job.id);
    if (attempt == null) {
      if (await giveUpExhaustedWebhook(supabase, job.id)) {
        console.error(`[bulk] webhook give-up ${job.id}: attempt cap reached without a successful send`);
      }
      return;
    }

    try {
      await postBulkWebhook(job.webhook_url, webhookPayload(job), undefined, timing);
      const marked = await markWebhookSent(supabase, job.id);
      if (!marked) console.error("[bulk] webhook sent but flag was not stored", job.id);
    } catch (error) {
      const permanent = error instanceof WebhookDeliveryError && error.permanent;
      const message = error instanceof Error ? error.message : String(error);
      if (permanent || attempt >= WEBHOOK_ATTEMPT_CAP) {
        console.error(`[bulk] webhook give-up ${job.id} after ${attempt} attempt(s): ${message}`);
        await markWebhookSent(supabase, job.id);
        return;
      }
      console.error(`[bulk] webhook failed ${job.id} attempt ${attempt}/${WEBHOOK_ATTEMPT_CAP}, left unsent: ${message}`);
      await releaseWebhookAttempt(supabase, job.id);
    }
  } catch (error) {
    console.error("[bulk] webhook delivery error", job.id, error);
  }
}

export async function retryUnsentBulkWebhooks(
  supabase: Admin,
  limit = 20,
  attempted: Set<string> = new Set(),
): Promise<number> {
  const { data, error } = await supabase
    .from("bulk_jobs")
    .select("id, status, completed, total, created_at, results, webhook_url")
    .in("status", ["completed", "failed"])
    .is("webhook_sent_at", null)
    .not("webhook_url", "is", null)
    .limit(limit);
  if (error) {
    console.error("[bulk] webhook retry scan failed", error);
    return 0;
  }

  let retried = 0;
  for (const job of (data ?? []) as StoredJob[]) {
    if (attempted.has(job.id)) continue;
    retried += 1;
    await retryStoredBulkWebhook(supabase, job, attempted);
  }
  return retried;
}

export async function sweepStaleBulkJobs(
  supabase: Admin,
  now = Date.now(),
  attempted: Set<string> = new Set(),
): Promise<number> {
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
    await retryStoredBulkWebhook(supabase, {
      ...job,
      status: "failed",
      completed: next.scored.length,
      results: next,
    }, attempted);
  }
  return failed;
}

export async function advanceStoredBulkJob(
  supabase: Admin,
  job: StoredJob,
  score: (company: BulkCompanyInput, index: number, idempotencyKey: string) => Promise<BulkScoredRow>,
  budgetMs?: number,
  timing?: WebhookSendOptions,
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
  // Drop the lease when this window is done but companies remain, so the next
  // poll can claim immediately. A poll that arrives while this window still
  // holds the lease loses the atomic claim and does not score.
  const releaseLease = status === "processing";
  const { data: saved, error: updateError } = await supabase
    .from("bulk_jobs")
    .update({
      status,
      completed: next.scored.length,
      results: next,
      ...(releaseLease ? { lease_token: null, lease_until: null } : {}),
    })
    .eq("id", job.id)
    .eq("lease_token", token)
    .select("id")
    .maybeSingle();
  if (updateError) console.error("[bulk] job update failed", updateError);

  if (saved && status !== "processing") {
    await retryStoredBulkWebhook(supabase, {
      ...job,
      status,
      completed: next.scored.length,
      results: next,
    }, new Set(), timing);
  }
  return { status, state: next, claimed: true };
}

export { bulkJobStatus, freshBulkState, isBulkState };
