import { afterEach, describe, expect, it, vi } from "vitest";
import { freshBulkState, type BulkScoredRow } from "@/lib/bulk-job";
import { advanceStoredBulkJob } from "@/lib/bulk-job-runner";

vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "1.1.1.1", family: 4 }],
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

function leaseAdmin(jobId: string) {
  const job = {
    id: jobId,
    status: "processing",
    created_at: new Date().toISOString(),
    webhook_url: "https://example.com/hook",
    results: freshBulkState([{ domain: "acme.com" }, { domain: "beta.com" }]),
    lease_token: null as string | null,
    lease_until: null as string | null,
    webhook_sent_at: null as string | null,
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
        if (job.webhook_sent_at || job.status === "processing") return { data: false, error: null };
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
    vi.unstubAllGlobals();
  });

  it("lets only one of two overlapping polls score and send the webhook", async () => {
    const admin = leaseAdmin("job-1");
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(admin.job.webhook_sent_at).toBeTruthy();
    expect(admin.job.status).toBe("completed");
  });
});
