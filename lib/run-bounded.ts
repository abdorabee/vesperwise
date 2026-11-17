const DEFAULT_CONCURRENCY = 4;

/**
 * Runs `worker` over `items` with at most `limit` in flight. Results keep the
 * input order; a worker that throws is reported as a rejected settlement, so one
 * failure never stops the rest.
 */
export async function runBounded<T, R>(
  items: readonly T[],
  worker: (item: T) => Promise<R>,
  limit: number = DEFAULT_CONCURRENCY,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;

  async function lane(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index]) };
      } catch (reason: unknown) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const lanes = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: lanes }, lane));
  return results;
}
