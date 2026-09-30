function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function sleep(ms, signal) {
  if (ms <= 0 || signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = setTimeout(done, ms);

    function done() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", done);
      resolve();
    }

    signal?.addEventListener("abort", done, { once: true });
  });
}

async function callRpc(supabase, name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data;
}

async function claimJob(supabase, queue, lockSeconds) {
  const data = await callRpc(supabase, "claim_background_job", {
    p_queue: queue,
    p_lock_seconds: lockSeconds,
  });
  return firstRow(data);
}

function mapJob(row) {
  return {
    id: row.id,
    data: row.payload,
    attemptsMade: Math.max(0, Number(row.attempts ?? 1) - 1),
  };
}

/**
 * @typedef {{ id: string, data: any, attemptsMade: number }} QueueJob
 * @param {{
 *   supabase: { rpc: (name: string, args?: object) => PromiseLike<{ data: any, error: any }> },
 *   queue: string,
 *   handler: (job: QueueJob) => Promise<unknown>,
 *   lockSeconds: number,
 *   pollIntervalMs?: number,
 *   backoffSeconds?: number,
 *   onFailed?: (job: QueueJob, error: any) => unknown,
 *   signal?: AbortSignal,
 *   stop?: () => boolean,
 * }} options
 */
export async function runQueueWorker({
  supabase,
  queue,
  handler,
  lockSeconds,
  pollIntervalMs = 5000,
  backoffSeconds = 30,
  onFailed,
  signal,
  stop,
}) {
  const shouldStop = () => signal?.aborted || stop?.() === true;

  while (!shouldStop()) {
    try {
      const processed = await processNextJob({
        supabase,
        queue,
        handler,
        lockSeconds,
        backoffSeconds,
        onFailed,
      });
      if (!processed) await sleep(pollIntervalMs, signal);
    } catch (error) {
      // Transient database/network failures must not kill the worker; an
      // unacknowledged job is reclaimed once its lock expires.
      console.error(`[pg-queue:${queue}] poll failed`, error);
      await sleep(pollIntervalMs, signal);
    }
  }
}

async function processNextJob({
  supabase,
  queue,
  handler,
  lockSeconds,
  backoffSeconds,
  onFailed,
}) {
  const row = await claimJob(supabase, queue, lockSeconds);
  if (!row) return false;

  const job = mapJob(row);
  let handlerError = null;
  try {
    await handler(job);
  } catch (error) {
    handlerError = error;
  }

  if (!handlerError) {
    await callRpc(supabase, "complete_background_job", { p_id: job.id });
    return true;
  }

  await callRpc(supabase, "fail_background_job", {
    p_id: job.id,
    p_error: errorMessage(handlerError),
    p_backoff_seconds: backoffSeconds,
  });

  if (onFailed) {
    try {
      await onFailed(job, handlerError);
    } catch (onFailedError) {
      console.error("[pg-queue] onFailed handler failed", onFailedError);
    }
  }
  return true;
}
