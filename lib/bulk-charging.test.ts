import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as bulkInlinePost } from "@/app/api/v1/score/bulk-inline/route";
import { GET as bulkGet, POST as bulkPost } from "@/app/api/v1/score/bulk/route";
import { auth } from "@clerk/nextjs/server";
import { cacheGet } from "@/lib/cache";
import { InsufficientCreditsError, scoreCompany } from "@/lib/score-service";
import { BULK_INLINE_MAX_ROWS, BULK_MAX_PER_JOB } from "@/lib/plan-features";
import { createSupabaseAdmin } from "@/lib/supabase";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/score-service", () => {
  class InsufficientCreditsError extends Error {
    creditsRemaining: number;
    constructor(remaining = 0) {
      super("Insufficient credits");
      this.name = "InsufficientCreditsError";
      this.creditsRemaining = remaining;
    }
  }
  return {
    scoreCompany: vi.fn(),
    domainToCompanyName: (domain: string) => domain,
    canonicalizeDomain: (domain: string) => domain.trim().toLowerCase(),
    scoringProfileHash: () => "hash",
    InsufficientCreditsError,
    InvalidDomainError: class InvalidDomainError extends Error {
      constructor() {
        super("invalid");
        this.name = "InvalidDomainError";
      }
    },
  };
});
vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn(async () => null),
  scoreResultCacheKey: (userId: string, domain: string) => `${userId}:${domain}`,
}));

const mockAuth = vi.mocked(auth);
const mockScoreCompany = vi.mocked(scoreCompany);
const mockCacheGet = vi.mocked(cacheGet);
const mockAdmin = vi.mocked(createSupabaseAdmin);

const userId = "user_test123";

interface LedgerRow {
  user_id: string;
  amount: number;
  type: string;
  reason: string;
  score_run_id: string;
}

const ledger = {
  credits: 100,
  logs: [] as LedgerRow[],
  seen: new Map<string, Record<string, unknown>>(),
  cached: new Set<string>(),
};

const jobs = new Map<string, Record<string, unknown>>();

function resetLedger(credits: number) {
  ledger.credits = credits;
  ledger.logs = [];
  ledger.seen.clear();
  ledger.cached.clear();
  jobs.clear();
  mockCacheGet.mockImplementation(async (key: string) => (ledger.cached.has(key) ? { hit: true } : null));
}

function scoredRow(domain: string, charged: boolean, cached: boolean) {
  return {
    domain,
    company: domain,
    intent_score: 70,
    score_band: "WARM",
    cached,
    charged,
    signals: {},
    ai_summary: "Test",
    recommended_action: "Test",
    buying_stage: "consideration",
    urgency: "this-week",
    key_triggers: [],
    email_subject: "Test",
    talk_track: "Test",
    score_status: "complete",
    data_coverage: 0.8,
    icp_fit_score: 80,
    last_updated: "2026-10-25T00:00:00Z",
  };
}

function installScoreMock() {
  mockScoreCompany.mockImplementation(async (opts) => {
    const key = opts.idempotencyKey ?? "";
    const prior = ledger.seen.get(key);
    if (prior) return { ...prior, cached: true, charged: false, idempotent_replayed: true } as never;
    const cacheKey = `${opts.userId}:${opts.domain}`;
    if (opts.skipCredits) {
      const row = scoredRow(opts.domain, false, false);
      ledger.seen.set(key, row);
      return row as never;
    }
    if (ledger.cached.has(cacheKey)) {
      const row = scoredRow(opts.domain, false, true);
      ledger.seen.set(key, row);
      return row as never;
    }
    if (ledger.credits < 1) throw new InsufficientCreditsError(ledger.credits);
    ledger.credits -= 1;
    ledger.logs.push({
      user_id: opts.userId,
      amount: 1,
      type: "debit",
      reason: "API score request",
      score_run_id: key,
    });
    ledger.cached.add(cacheKey);
    const row = scoredRow(opts.domain, true, false);
    ledger.seen.set(key, row);
    return row as never;
  });
}

function finishQuery(state: {
  table: string;
  op: string;
  payload: Record<string, unknown> | null;
  filters: Record<string, unknown>;
  head: boolean;
}, mode: "one" | "maybe" | "list") {
  if (state.table === "api_keys") {
    return { data: { user_id: userId, is_active: true }, error: null };
  }
  if (state.table === "users") {
    const row = {
      plan: "plus",
      product_category: "B2B SaaS",
      business_profile: null,
      credits_remaining: ledger.credits,
    };
    return { data: mode === "maybe" ? { credits_remaining: ledger.credits } : row, error: null };
  }
  if (state.table === "bulk_jobs") {
    if (state.op === "insert" && state.payload) {
      const id = `job_${jobs.size + 1}`;
      const row = { id, user_id: userId, webhook_url: null, ...state.payload };
      jobs.set(id, row);
      return { data: row, error: null };
    }
    if (state.op === "update" && state.payload) {
      const job = jobs.get(String(state.filters.id));
      if (job) Object.assign(job, state.payload);
      return { data: job ? { id: job.id } : null, error: null };
    }
    if (state.head) return { count: 0, data: null, error: null };
    if (mode === "one") return { data: jobs.get(String(state.filters.id)) ?? null, error: null };
    return { data: [], error: null };
  }
  return { data: null, error: null, count: 0 };
}

function installAdmin() {
  mockAdmin.mockReturnValue({
    from(table: string) {
      const state = {
        table,
        op: "select",
        payload: null as Record<string, unknown> | null,
        filters: {} as Record<string, unknown>,
        head: false,
      };
      const query = {
        select: (_columns?: string, options?: { head?: boolean }) => {
          if (options?.head) state.head = true;
          return query;
        },
        eq: (column: string, value: unknown) => {
          state.filters[column] = value;
          return query;
        },
        in: () => query,
        insert: (row: Record<string, unknown>) => {
          state.op = "insert";
          state.payload = row;
          return query;
        },
        update: (row: Record<string, unknown>) => {
          state.op = "update";
          state.payload = row;
          return query;
        },
        single: () => Promise.resolve(finishQuery(state, "one")),
        maybeSingle: () => Promise.resolve(finishQuery(state, "maybe")),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(finishQuery(state, "list")).then(resolve, reject),
      };
      return query;
    },
    rpc: async (name: string, args: { p_job_id?: string }) => {
      if (name === "claim_bulk_job") {
        const job = args.p_job_id ? jobs.get(args.p_job_id) : undefined;
        return { data: job ? [job] : [], error: null };
      }
      return { data: null, error: null };
    },
  } as never);
}

function inlineRequest(csv: string, init: { estimate?: boolean; idempotencyKey?: string } = {}) {
  const form = new FormData();
  form.set("file", new File([csv], "accounts.csv", { type: "text/csv" }));
  if (init.estimate) form.set("estimate", "1");
  return new NextRequest("http://localhost/api/v1/score/bulk-inline", {
    method: "POST",
    body: form,
    headers: init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : undefined,
  });
}

function bulkRequest(domains: string[]) {
  return new NextRequest("http://localhost/api/v1/score/bulk", {
    method: "POST",
    headers: { authorization: "Bearer test-key", "content-type": "application/json" },
    body: JSON.stringify({ companies: domains.map((domain) => ({ domain })) }),
  });
}

describe("bulk charging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLedger(100);
    mockAuth.mockResolvedValue({ userId } as never);
    installAdmin();
    installScoreMock();
    delete process.env.DISABLE_CREDIT_CHECK;
    delete process.env.DEV_BYPASS_CREDITS;
  });

  describe("bulk-inline", () => {
    const csv = "domain\none.example\ntwo.example\nthree.example\n";

    it("rejects a file above the dashboard batch cap", async () => {
      const count = BULK_INLINE_MAX_ROWS + 1;
      const rows = Array.from({ length: count }, (_, i) => `co${i}.example`).join("\n");
      const response = await bulkInlinePost(inlineRequest(`domain\n${rows}\n`));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe(
        `Maximum ${BULK_INLINE_MAX_ROWS} companies per batch. Your file has ${count} rows.`,
      );
      expect(mockScoreCompany).not.toHaveBeenCalled();
    });

    it("debits one credit and one ledger row per fresh row", async () => {
      const response = await bulkInlinePost(inlineRequest(csv));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.scored).toBe(3);
      expect(body.estimated_fresh).toBe(3);
      expect(ledger.credits).toBe(97);
      expect(ledger.logs).toHaveLength(3);
      expect(ledger.logs.every((row) => row.reason === "API score request" && row.amount === 1 && row.type === "debit")).toBe(true);
      expect(mockScoreCompany).toHaveBeenCalledTimes(3);
      for (const call of mockScoreCompany.mock.calls) {
        expect(call[0].skipCredits).toBe(false);
        expect(call[0].idempotencyKey).toMatch(/^bulk-inline:user_test123:/);
      }
    });

    it("debits nothing for cached rows", async () => {
      for (const domain of ["one.example", "two.example", "three.example"]) {
        ledger.cached.add(`${userId}:${domain}`);
      }
      const response = await bulkInlinePost(inlineRequest(csv));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.estimated_fresh).toBe(0);
      expect(body.estimated_cached).toBe(3);
      expect(body.credits_charged).toBe(0);
      expect(ledger.credits).toBe(100);
      expect(ledger.logs).toHaveLength(0);
    });

    it("stops before scoring when the estimate exceeds the balance", async () => {
      resetLedger(1);
      installScoreMock();
      const response = await bulkInlinePost(inlineRequest(csv));
      const body = await response.json();
      expect(response.status).toBe(402);
      expect(body.error).toBe("Insufficient credits");
      expect(body.estimated_fresh).toBe(3);
      expect(body.credits_needed).toBe(3);
      expect(body.credits_remaining).toBe(1);
      expect(mockScoreCompany).not.toHaveBeenCalled();
      expect(ledger.logs).toHaveLength(0);
      expect(ledger.credits).toBe(1);
    });

    it("returns the cost estimate without scoring", async () => {
      const response = await bulkInlinePost(inlineRequest(csv, { estimate: true }));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.estimated_fresh).toBe(3);
      expect(body.credits_needed).toBe(3);
      expect(mockScoreCompany).not.toHaveBeenCalled();
      expect(ledger.credits).toBe(100);
    });

    it("still charges in production when DISABLE_CREDIT_CHECK is set", async () => {
      const previousDisable = process.env.DISABLE_CREDIT_CHECK;
      const previousVercel = process.env.VERCEL_ENV;
      process.env.DISABLE_CREDIT_CHECK = "true";
      process.env.VERCEL_ENV = "production";
      try {
        const response = await bulkInlinePost(inlineRequest("domain\none.example\n"));
        expect(response.status).toBe(200);
        expect(mockScoreCompany.mock.calls[0][0].skipCredits).toBe(false);
        expect(ledger.credits).toBe(99);
        expect(ledger.logs).toHaveLength(1);
      } finally {
        if (previousDisable === undefined) delete process.env.DISABLE_CREDIT_CHECK;
        else process.env.DISABLE_CREDIT_CHECK = previousDisable;
        if (previousVercel === undefined) delete process.env.VERCEL_ENV;
        else process.env.VERCEL_ENV = previousVercel;
      }
    });

    it("does not debit again when the same idempotency key is retried", async () => {
      const first = await bulkInlinePost(inlineRequest(csv, { idempotencyKey: "batch-1" }));
      expect(first.status).toBe(200);
      expect(ledger.logs).toHaveLength(3);
      const second = await bulkInlinePost(inlineRequest(csv, { idempotencyKey: "batch-1" }));
      const body = await second.json();
      expect(second.status).toBe(200);
      expect(body.credits_charged).toBe(0);
      expect(ledger.logs).toHaveLength(3);
      expect(ledger.credits).toBe(97);
    });
  });

  describe("bulk job route", () => {
    it("rejects a job above the queued cap", async () => {
      const domains = Array.from({ length: BULK_MAX_PER_JOB + 1 }, (_, i) => `co${i}.example`);
      const response = await bulkPost(bulkRequest(domains));
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.message).toBe(`Max ${BULK_MAX_PER_JOB.toLocaleString("en-US")} companies per job`);
      expect(mockScoreCompany).not.toHaveBeenCalled();
    });

    it("debits one credit and one ledger row per fresh company", async () => {
      const response = await bulkPost(bulkRequest(["one.example", "two.example", "three.example"]));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.credits_charged).toBe(3);
      expect(body.completed).toBe(3);
      expect(body.stopped).toBeNull();
      expect(ledger.credits).toBe(97);
      expect(ledger.logs).toHaveLength(3);
      expect(ledger.logs.every((row) => row.reason === "API score request")).toBe(true);
      const keys = mockScoreCompany.mock.calls.map((call) => call[0].idempotencyKey);
      expect(keys).toEqual([
        `bulk:${body.job_id}:0`,
        `bulk:${body.job_id}:1`,
        `bulk:${body.job_id}:2`,
      ]);
    });

    it("debits nothing for cached companies", async () => {
      ledger.cached.add(`${userId}:one.example`);
      ledger.cached.add(`${userId}:two.example`);
      const response = await bulkPost(bulkRequest(["one.example", "two.example"]));
      const body = await response.json();
      expect(body.credits_charged).toBe(0);
      expect(body.completed).toBe(2);
      expect(ledger.credits).toBe(100);
      expect(ledger.logs).toHaveLength(0);
    });

    it("stops cleanly when credits run out mid-job", async () => {
      resetLedger(1);
      installScoreMock();
      const response = await bulkPost(bulkRequest(["one.example", "two.example", "three.example"]));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.stopped).toBe("insufficient_credits");
      expect(body.credits_charged).toBe(1);
      expect(body.completed).toBe(1);
      expect(body.partial).toBe(true);
      expect(ledger.logs).toHaveLength(1);
      expect(ledger.credits).toBe(0);
      expect(mockScoreCompany).toHaveBeenCalledTimes(2);
    });

    it("retries the same job without a second debit", async () => {
      const created = await bulkPost(bulkRequest(["one.example", "two.example", "three.example"]));
      const body = await created.json();
      const calls = mockScoreCompany.mock.calls.map((call) => call[0]);
      for (const opts of calls) await scoreCompany(opts);
      expect(ledger.logs).toHaveLength(3);
      expect(ledger.credits).toBe(97);
      const beforeGet = mockScoreCompany.mock.calls.length;
      const replay = await bulkGet(new NextRequest(`http://localhost/api/v1/score/bulk?job_id=${body.job_id}`, {
        headers: { authorization: "Bearer test-key" },
      }));
      expect(replay.status).toBe(200);
      expect(mockScoreCompany.mock.calls.length).toBe(beforeGet);
    });
  });
});
