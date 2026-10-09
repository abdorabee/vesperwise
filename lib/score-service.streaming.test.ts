import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BriefSpec } from "./brief";
import type { SignalContribution, SignalResult, SignalSet } from "./types";

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  createSupabaseAdmin: vi.fn(),
  generateReasoning: vi.fn(),
  enqueueHiringRefresh: vi.fn(),
  enqueueWebEnrichment: vi.fn(),
  updatePipelineStage: vi.fn(),
  createInboxNotification: vi.fn(),
}));

vi.mock("@/lib/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cache")>();
  return {
    ...actual,
    cacheGet: mocks.cacheGet,
    cacheSet: mocks.cacheSet,
  };
});

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: mocks.createSupabaseAdmin,
}));

vi.mock("@/lib/reasoning", () => ({
  generateReasoning: mocks.generateReasoning,
}));

vi.mock("@/lib/hiring-refresh-queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hiring-refresh-queue")>();
  return {
    ...actual,
    enqueueHiringRefresh: mocks.enqueueHiringRefresh,
  };
});

vi.mock("@/lib/web-enrichment-queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/web-enrichment-queue")>();
  return {
    ...actual,
    enqueueWebEnrichment: mocks.enqueueWebEnrichment,
  };
});

vi.mock("@/lib/pipeline", () => ({
  updatePipelineStage: mocks.updatePipelineStage,
}));

vi.mock("@/lib/inbox", () => ({
  createInboxNotification: mocks.createInboxNotification,
}));

const streamedBrief: BriefSpec = {
  version: 1,
  headline: "Acme is ready for a focused brief",
  personas: ["VP Sales"],
  openers: {
    hiring: {
      "VP Sales": "Saw {signal.hiring.detail}. Worth a quick look?",
    },
  },
  layout: [
    { type: "score_hero" },
    { type: "timing_slider", note: "{company} is {band} at {score}." },
    { type: "next_steps", actions: [{ label: "Draft email", prompt: "Write to {persona} at {company}." }] },
  ],
};

function signal(overrides: Partial<SignalResult> = {}): SignalResult {
  return {
    score: 16,
    max: 20,
    detail: "Hiring revenue operations leaders",
    status: "ok",
    observed_at: "2026-10-01T12:00:00.000Z",
    fetched_at: "2026-10-02T12:00:00.000Z",
    source: "mock",
    evidence: [],
    ...overrides,
  };
}

function signalSet(): SignalSet {
  return {
    funding: signal({ score: 0, max: 25, status: "no_signal", detail: "No recent funding", observed_at: null }),
    hiring: signal(),
    news: signal({ score: 0, status: "no_signal", detail: "No qualifying news", observed_at: null }),
    technology: signal({ score: 0, status: "no_signal", detail: "No technology signal", observed_at: null }),
    web: signal({ score: 4, max: 15, detail: "Web context", status: "ok" }),
    github: signal({ score: 0, status: "no_signal", detail: "No GitHub activity", observed_at: null }),
    latestSignalDate: "2026-10-02T12:00:00.000Z",
  };
}

function contribution(): SignalContribution {
  return {
    type: "hiring",
    status: "ok",
    rawScore: 82,
    decayedScore: 78,
    freshness: 0.95,
    daysAgo: 4,
    summary: "Hiring revenue operations leaders",
    baseWeight: 19,
    effectiveWeight: 19,
    contribution: 21,
    observedAt: "2026-10-01T12:00:00.000Z",
    halfLifeDays: 30,
  };
}

function storedScore(overrides: Record<string, unknown> = {}) {
  return {
    company: "Acme",
    domain: "acme.io",
    intent_score: 72,
    score_band: "WARM",
    last_updated: "2026-10-02T12:00:00.000Z",
    signals: signalSet(),
    ai_summary: "Acme has a focused hiring signal.",
    recommended_action: "Lead with hiring momentum.",
    buying_stage: "consideration",
    urgency: "this-week",
    key_triggers: ["Hiring revenue operations leaders"],
    why_now: "The hiring signal is recent.",
    email_subject: "Revenue hiring at Acme",
    talk_track: "I noticed the hiring signal.",
    score_decay_date: "2026-10-02",
    model_tier: "free",
    scoring_version: "v2-linear-2026-07",
    score_status: "complete",
    data_coverage: 0.82,
    contributions: [contribution()],
    cached: false,
    charged: true,
    icp_fit_score: null,
    model_fallback: false,
    automation_eligible: false,
    is_baseline: true,
    profile_hash: "profile",
    source_status: {
      funding: "no_signal",
      hiring: "ok",
      news: "no_signal",
      technology: "no_signal",
      web_activity: "unavailable",
      web: "ok",
      github: "no_signal",
    },
    score_id: "score_1",
    score_run_id: "run_1",
    previous_v2_score: null,
    previous_v2_band: null,
    ...overrides,
  };
}

describe("scoreCompany streamed brief progress", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.cacheSet.mockResolvedValue(undefined);
    mocks.enqueueHiringRefresh.mockResolvedValue(undefined);
    mocks.enqueueWebEnrichment.mockResolvedValue(undefined);
    mocks.updatePipelineStage.mockResolvedValue(undefined);
    mocks.createInboxNotification.mockResolvedValue(undefined);
    mocks.createSupabaseAdmin.mockReturnValue({ rpc: vi.fn(), from: vi.fn() });
    mocks.generateReasoning.mockImplementation(async (
      _company: string,
      _score: number,
      _band: string,
      _signals: SignalSet,
      _product: string,
      _isFirstScore: boolean,
      _businessProfile: unknown,
      options?: { onBrief?: (spec: BriefSpec) => void },
    ) => {
      options?.onBrief?.(streamedBrief);
      return {
        ai_summary: "Acme has a focused hiring signal.",
        recommended_action: "Lead with hiring momentum.",
        buying_stage: "consideration",
        urgency: "this-week",
        key_triggers: ["Hiring revenue operations leaders"],
        why_now: "The hiring signal is recent.",
        email_subject: "Revenue hiring at Acme",
        talk_track: "I noticed the hiring signal.",
        brief: streamedBrief,
        model_tier: "free",
        used_fallback: false,
      };
    });
  });

  it("emits score_ready and one brief on cache hits", async () => {
    mocks.cacheGet.mockResolvedValue(storedScore({ brief: streamedBrief }));
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    const { scoreCompany } = await import("./score-service");

    const result = await scoreCompany({
      domain: "acme.io",
      userId: "user_1",
      onProgress: (event) => events.push(event),
    });

    expect(result.cached).toBe(true);
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(["score_ready", "brief"]));
    expect(events.find((event) => event.type === "score_ready")).toMatchObject({
      company: "Acme",
      domain: "acme.io",
      intent_score: 72,
      score_band: "WARM",
      contributions: [{ type: "hiring", summary: "Hiring revenue operations leaders" }],
    });
    expect(events.find((event) => event.type === "brief")).toEqual({ type: "brief", spec: streamedBrief });
  });

  it("emits score_ready before reasoning starts on fresh scores and wires streamed briefs", async () => {
    vi.stubEnv("MOCK_SIGNALS", "true");
    mocks.cacheGet.mockResolvedValue(null);
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "begin_score_run") {
        return {
          data: [{
            run_id: "run_fresh",
            run_status: "running",
            stored_result: null,
            error_code: null,
            cache_hit: false,
            credits_remaining: 10,
            is_baseline: true,
            owns_run: true,
            idempotent_replay: false,
          }],
          error: null,
        };
      }
      if (name === "complete_score_run") {
        return {
          data: [{
            completed_run_id: "run_fresh",
            completed_score_id: "score_fresh",
            stored_result: args.p_result,
            charged: false,
          }],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    mocks.createSupabaseAdmin.mockReturnValue({ rpc, from: vi.fn() });
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    const { scoreCompany } = await import("./score-service");

    await scoreCompany({
      domain: "acme.io",
      userId: "user_1",
      skipCredits: true,
      onProgress: (event) => events.push(event),
    });

    const types = events.map((event) => event.type);
    expect(types.indexOf("score_ready")).toBeGreaterThanOrEqual(0);
    expect(types.indexOf("score_ready")).toBeLessThan(types.indexOf("reasoning_start"));
    expect(types).toContain("brief");
    expect(mocks.generateReasoning.mock.calls[0][7]).toMatchObject({
      contributions: expect.arrayContaining([expect.objectContaining({ type: "hiring" })]),
    });
  });
});
