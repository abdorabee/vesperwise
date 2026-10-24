import { lookup } from "node:dns/promises";
import https from "node:https";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshBulkState, type BulkCompanyInput, type BulkScoredRow } from "@/lib/bulk-job";
import {
  advanceStoredBulkJob,
  retryStoredBulkWebhook,
  retryUnsentBulkWebhooks,
  WEBHOOK_ATTEMPT_CAP,
  WEBHOOK_RETRY_BUDGET_MS,
  WEBHOOK_RETRY_LIMIT,
} from "@/lib/bulk-job-runner";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "1.1.1.1", family: 4 }]),
}));

function scored(domain: string): BulkScoredRow {
  return {
    domain,
    company_name: domain,
    intent_score: 10,
    score_band: "COLD",
    cached: false,
    charged: true,
  };
}

function leaseAdmin(jobId: string, companies: BulkCompanyInput[] = [{ domain: "acme.com" }, { domain: "beta.com" }]) {
  const job = {
    id: jobId,
    status: "processing",
    created_at: new Date().toISOString(),
    webhook_url: "https://example.com/hook",
    results: freshBulkState(companies),
    lease_token: null as string | null,
    lease_until: null as string | null,
    webhook_sent_at: null as string | null,
    webhook_attempts: 0,
    webhook_attempt_until: null as string | null,
  };

  return {
    job,
    rpc: async (name: string, args: Record<string, string | number>) => {
      if (name === "claim_bulk_job") {
        const until = job.lease_until ? new Date(job.lease_until).getTime() : 0;
        const token = String(args.p_token);
        if (job.status !== "processing" || (until > Date.now() && job.lease_token && job.lease_token !== token)) {
          return { data: [], error: null };
        }
        job.lease_token = token;
        job.lease_until = new Date(Date.now() + Number(args.p_lease_seconds) * 1000).toISOString();
        return { data: [{ ...job }], error: null };
      }
      if (name === "mark_bulk_webhook_sent") {
        if (job.webhook_sent_at || job.status === "processing" || !job.webhook_url) return { data: false, error: null };
        job.webhook_sent_at = new Date().toISOString();
        return { data: true, error: null };
      }
      if (name === "claim_bulk_webhook_attempt") {
        const until = job.webhook_attempt_until ? new Date(job.webhook_attempt_until).getTime() : 0;
        const max = Number(args.p_max_attempts);
        if (
          job.webhook_sent_at
          || !job.webhook_url
          || (job.status !== "completed" && job.status !== "failed")
          || job.webhook_attempts >= max
          || until > Date.now()
        ) {
          return { data: null, error: null };
        }
        job.webhook_attempts += 1;
        job.webhook_attempt_until = new Date(Date.now() + Number(args.p_lease_seconds) * 1000).toISOString();
        return { data: job.webhook_attempts, error: null };
      }
      if (name === "release_bulk_webhook_attempt") {
        if (!job.webhook_sent_at) job.webhook_attempt_until = null;
        return { data: null, error: null };
      }
      if (name === "give_up_bulk_webhook") {
        const until = job.webhook_attempt_until ? new Date(job.webhook_attempt_until).getTime() : 0;
        const max = Number(args.p_max_attempts);
        if (job.webhook_sent_at || job.webhook_attempts < max || until > Date.now()) {
          return { data: false, error: null };
        }
        job.webhook_sent_at = new Date().toISOString();
        return { data: true, error: null };
      }
      return { data: null, error: { message: name } };
    },
    from: () => ({
      update: (values: Record<string, unknown>) => {
        const filters: Record<string, unknown> = {};
        const chain = {
          eq(column: string, value: unknown) {
            filters[column] = value;
            return chain;
          },
          in() {
            return chain;
          },
          select() {
            return {
              maybeSingle: async () => {
                if (filters.id !== job.id) return { data: null, error: null };
                if ("lease_token" in filters && filters.lease_token !== job.lease_token) {
                  return { data: null, error: null };
                }
                Object.assign(job, values);
                return { data: { id: job.id }, error: null };
              },
            };
          },
        };
        return chain;
      },
    }),
  };
}

describe("bulk job lease", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(lookup).mockImplementation((async () => [{ address: "1.1.1.1", family: 4 }]) as unknown as typeof lookup);
  });

  function silenceHttps() {
    return vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; on: (event: string, fn: () => void) => unknown }) => void;
      const res = {
        statusCode: 204,
        resume() {},
        on(event: string, fn: () => void) {
          if (event === "end") queueMicrotask(fn);
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return {
        end() {},
        destroy() { return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);
  }

  it("lets only one of two overlapping polls score and send the webhook", async () => {
    const admin = leaseAdmin("job-1");
    const httpsMock = silenceHttps();
    const seen = new Set<string>();

    const score = async (_company: { domain?: string }, _index: number, key: string) => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      if (seen.has(key)) throw new Error(`double debit ${key}`);
      seen.add(key);
      return scored(key);
    };

    const [first, second] = await Promise.all([
      advanceStoredBulkJob(admin as never, admin.job, score, 5_000),
      advanceStoredBulkJob(admin as never, admin.job, score, 5_000),
    ]);

    const claimed = [first, second].filter((result) => result.claimed);
    expect(claimed).toHaveLength(1);
    expect(seen.size).toBe(2);
    expect([...seen].sort()).toEqual(["bulk:job-1:0", "bulk:job-1:1"]);
    expect(httpsMock).toHaveBeenCalledTimes(1);
    expect(admin.job.webhook_sent_at).toBeTruthy();
    expect(admin.job.status).toBe("completed");
  });

  it("lets the next poll claim as soon as a window finishes, and rejects a poll during it", async () => {
    const companies = Array.from({ length: 21 }, (_, index) => ({ domain: `c${index}.example` }));
    const admin = leaseAdmin("job-2", companies);
    silenceHttps();
    let releaseFirst: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const keys: string[] = [];
    let entered = 0;

    const score = async (_company: BulkCompanyInput, _index: number, key: string) => {
      entered += 1;
      if (entered === 1) await gate;
      if (keys.includes(key)) throw new Error(`double debit ${key}`);
      keys.push(key);
      return scored(key);
    };

    const running = advanceStoredBulkJob(admin as never, admin.job, score, 40);
    await vi.waitUntil(() => entered === 1);
    const during = await advanceStoredBulkJob(admin as never, admin.job, score, 5_000);
    expect(during.claimed).toBe(false);
    expect(keys).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 80));
    releaseFirst();
    const first = await running;

    expect(first.claimed).toBe(true);
    expect(first.status).toBe("processing");
    expect(admin.job.lease_until).toBeNull();
    expect(admin.job.lease_token).toBeNull();
    expect(keys).toHaveLength(20);

    const next = await advanceStoredBulkJob(admin as never, admin.job, score, 5_000);
    expect(next.claimed).toBe(true);
    expect(next.status).toBe("completed");
    expect(keys).toHaveLength(21);
    expect(new Set(keys).size).toBe(21);
  });

  function refusedHttps() {
    return vi.spyOn(https, "request").mockImplementation((() => ({
      end() {},
      destroy() { return this; },
      on(event: string, fn: (error: Error) => void) {
        if (event === "error") queueMicrotask(() => fn(new Error("connect ECONNREFUSED")));
        return this;
      },
      setTimeout() { return this; },
    })) as unknown as typeof https.request);
  }

  it("keeps the job completed when the webhook fails and leaves it unsent", async () => {
    const admin = leaseAdmin("job-fail");
    const httpsMock = refusedHttps();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000);

    expect(result.status).toBe("completed");
    expect(admin.job.status).toBe("completed");
    expect(admin.job.webhook_sent_at).toBeNull();
    expect(admin.job.webhook_attempts).toBe(1);
    expect(admin.job.webhook_attempt_until).toBeNull();
    expect(httpsMock).toHaveBeenCalledTimes(1);
    expect(error.mock.calls.some((call) => String(call[0]).includes("left unsent"))).toBe(true);
    error.mockRestore();
  });

  it("returns the completed job when the webhook never responds", async () => {
    const admin = leaseAdmin("job-hang", [{ domain: "acme.com" }]);
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; destroy: () => void; on: () => unknown }) => void;
      queueMicrotask(() => callback({
        statusCode: 200,
        resume() {},
        destroy() {},
        on() { return this; },
      }));
      return {
        end() {},
        destroy() { return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const started = Date.now();

    const result = await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000, {
      deadlineMs: 50,
      connectTimeoutMs: 2_000,
    });

    expect(Date.now() - started).toBeLessThan(500);
    expect(result.status).toBe("completed");
    expect(admin.job.status).toBe("completed");
    expect(admin.job.webhook_sent_at).toBeNull();
    expect(admin.job.webhook_attempts).toBe(1);
    error.mockRestore();
  });

  it("retries an unsent webhook on the next poll and marks it sent after success", async () => {
    const admin = leaseAdmin("job-retry", [{ domain: "acme.com" }]);
    let calls = 0;
    vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      calls += 1;
      if (calls === 1) {
        return {
          end() {},
          destroy() { return this; },
          on(event: string, fn: (error: Error) => void) {
            if (event === "error") queueMicrotask(() => fn(new Error("connect ECONNREFUSED")));
            return this;
          },
          setTimeout() { return this; },
        };
      }
      const callback = args[1] as (res: { statusCode?: number; resume: () => void; on: (event: string, fn: () => void) => unknown }) => void;
      const res = {
        statusCode: 204,
        resume() {},
        on(event: string, fn: () => void) {
          if (event === "end") queueMicrotask(fn);
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return { end() {}, destroy() { return this; }, on() { return this; }, setTimeout() { return this; } };
    }) as unknown as typeof https.request);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000);
    expect(admin.job.webhook_sent_at).toBeNull();
    expect(admin.job.status).toBe("completed");

    await retryStoredBulkWebhook(admin as never, admin.job);
    expect(calls).toBe(2);
    expect(admin.job.webhook_sent_at).toBeTruthy();
    expect(admin.job.status).toBe("completed");
    error.mockRestore();
  });

  it("gives up after the attempt cap and only then marks the webhook sent", async () => {
    const admin = leaseAdmin("job-cap", [{ domain: "acme.com" }]);
    refusedHttps();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000);
    while (admin.job.webhook_attempts < WEBHOOK_ATTEMPT_CAP - 1) {
      await retryStoredBulkWebhook(admin as never, { ...admin.job });
    }
    expect(admin.job.webhook_sent_at).toBeNull();
    expect(admin.job.webhook_attempts).toBe(WEBHOOK_ATTEMPT_CAP - 1);

    await retryStoredBulkWebhook(admin as never, { ...admin.job });
    expect(admin.job.webhook_attempts).toBe(WEBHOOK_ATTEMPT_CAP);
    expect(error.mock.calls.some((call) => String(call[0]).includes("give-up"))).toBe(true);
    expect(admin.job.webhook_sent_at).toBeTruthy();
    expect(admin.job.status).toBe("completed");
    error.mockRestore();
  });

  it("lets only one of two overlapping retries send", async () => {
    const admin = leaseAdmin("job-once", [{ domain: "acme.com" }]);
    admin.job.status = "completed";
    const httpsMock = silenceHttps();

    await Promise.all([
      retryStoredBulkWebhook(admin as never, admin.job),
      retryStoredBulkWebhook(admin as never, admin.job),
    ]);

    expect(httpsMock).toHaveBeenCalledTimes(1);
    expect(admin.job.webhook_attempts).toBe(1);
    expect(admin.job.webhook_sent_at).toBeTruthy();
  });

  function statusHttps(status: number) {
    return vi.spyOn(https, "request").mockImplementation(((...args: unknown[]) => {
      const callback = args[1] as (res: {
        statusCode?: number;
        resume: () => void;
        destroy: () => void;
        on: (event: string, fn: () => void) => unknown;
      }) => void;
      const res = {
        statusCode: status,
        resume() {},
        destroy() {},
        on(event: string, fn: () => void) {
          if (event === "end") queueMicrotask(fn);
          return res;
        },
      };
      queueMicrotask(() => callback(res));
      return {
        end() {},
        destroy() { return this; },
        on() { return this; },
        setTimeout() { return this; },
      };
    }) as unknown as typeof https.request);
  }

  it.each([500, 503, 429])("leaves the webhook unsent when the endpoint returns %s", async (status) => {
    const admin = leaseAdmin(`job-${status}`, [{ domain: "acme.com" }]);
    statusHttps(status);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000);

    expect(result.status).toBe("completed");
    expect(admin.job.webhook_sent_at).toBeNull();
    expect(admin.job.webhook_attempts).toBe(1);
    expect(error.mock.calls.some((call) => String(call[0]).includes("left unsent"))).toBe(true);
    error.mockRestore();
  });

  it.each([404, 301])("gives up when the endpoint returns %s", async (status) => {
    const admin = leaseAdmin(`job-${status}`, [{ domain: "acme.com" }]);
    statusHttps(status);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000);

    expect(result.status).toBe("completed");
    expect(admin.job.webhook_sent_at).toBeTruthy();
    expect(admin.job.webhook_attempts).toBe(1);
    expect(error.mock.calls.some((call) => String(call[0]).includes("give-up"))).toBe(true);
    error.mockRestore();
  });

  function retryQueue(rows: Array<{ id: string; created_at: string; webhook_attempts: number }>) {
    const order: string[] = [];
    const chain = {
      select() { return chain; },
      in() { return chain; },
      is() { return chain; },
      not() { return chain; },
      order(column: string, options: { ascending: boolean }) {
        order.push(`${column}:${options.ascending}`);
        return chain;
      },
      limit: async (count: number) => ({
        data: [...rows]
          .sort((left, right) => left.webhook_attempts - right.webhook_attempts || left.created_at.localeCompare(right.created_at))
          .slice(0, count)
          .map((row) => ({
            ...row,
            status: "completed",
            webhook_url: `https://example.com/${row.id}`,
            results: null,
          })),
        error: null,
      }),
    };
    const seen: string[] = [];
    const supabase = {
      from: () => chain,
      rpc: async (_name: string, args: { p_job_id?: string }) => {
        if (args.p_job_id && !seen.includes(args.p_job_id)) seen.push(args.p_job_id);
        return { data: null, error: null };
      },
    };
    return { order, seen, supabase };
  }

  it("retries fresh webhooks before ones that already failed, oldest first within each", async () => {
    const { order, seen, supabase } = retryQueue([
      { id: "failed-old", created_at: "2026-01-01T00:00:00.000Z", webhook_attempts: 2 },
      { id: "fresh-new", created_at: "2026-03-01T00:00:00.000Z", webhook_attempts: 0 },
      { id: "fresh-old", created_at: "2026-02-01T00:00:00.000Z", webhook_attempts: 0 },
    ]);

    const retried = await retryUnsentBulkWebhooks(supabase as never);

    expect(order).toEqual(["webhook_attempts:true", "created_at:true"]);
    expect(seen).toEqual(["fresh-old", "fresh-new", "failed-old"]);
    expect(retried).toBe(3);
    expect(WEBHOOK_RETRY_LIMIT).toBe(8);
    expect(WEBHOOK_RETRY_BUDGET_MS).toBe(40_000);
  });

  it("stops starting webhook sends once the sweep budget has elapsed", async () => {
    const { seen, supabase } = retryQueue([
      { id: "first", created_at: "2026-01-01T00:00:00.000Z", webhook_attempts: 0 },
      { id: "second", created_at: "2026-01-02T00:00:00.000Z", webhook_attempts: 0 },
      { id: "third", created_at: "2026-01-03T00:00:00.000Z", webhook_attempts: 0 },
    ]);
    const stamps = [0, 0, 10, 40];
    let tick = 0;
    const now = () => stamps[Math.min(tick++, stamps.length - 1)];

    const retried = await retryUnsentBulkWebhooks(supabase as never, 8, new Set(), { budgetMs: 40, now });

    expect(retried).toBe(2);
    expect(seen).toEqual(["first", "second"]);
  });

  it("gives up immediately when the webhook host is not public", async () => {
    vi.mocked(lookup).mockImplementation((async () => [{ address: "10.0.0.1", family: 4 }]) as unknown as typeof lookup);
    const httpsMock = silenceHttps();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const admin = leaseAdmin("job-private", [{ domain: "acme.com" }]);

    const result = await advanceStoredBulkJob(admin as never, admin.job, async () => scored("acme.com"), 5_000);

    expect(result.status).toBe("completed");
    expect(httpsMock).not.toHaveBeenCalled();
    expect(admin.job.webhook_sent_at).toBeTruthy();
    expect(error.mock.calls.some((call) => String(call[0]).includes("give-up"))).toBe(true);
    error.mockRestore();
  });
});
