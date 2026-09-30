import { createSupabaseAdmin } from "@/lib/supabase";

interface EnqueueOptions {
  maxAttempts?: number;
}

/** Queue writes are opt-in so environments without a worker never accumulate jobs. */
export function isBackgroundJobsEnabled(): boolean {
  return process.env.BACKGROUND_JOBS_ENABLED === "true";
}

export async function enqueueJob<T>(
  queue: string,
  dedupeKey: string,
  payload: T,
  options: EnqueueOptions = {}
): Promise<boolean> {
  if (!isBackgroundJobsEnabled()) return false;

  try {
    const { data, error } = await createSupabaseAdmin()
      .rpc("enqueue_background_job", {
        p_queue: queue,
        p_dedupe_key: dedupeKey,
        p_payload: payload,
        p_max_attempts: options.maxAttempts ?? 3,
      });

    if (error) {
      console.warn("[job-queue] enqueue failed", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.warn("[job-queue] enqueue failed", error);
    return false;
  }
}
