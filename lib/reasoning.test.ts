import { afterEach, describe, expect, it, vi } from "vitest";

import { generateReasoning } from "./reasoning";
import type { BusinessProfile, SignalResult, SignalSet } from "./types";

function signal(
  score: number,
  max: number,
  detail: string,
  opts: Partial<SignalResult> = {}
): SignalResult {
  return {
    score,
    max,
    detail,
    status: opts.status ?? (score > 0 ? "ok" : "no_signal"),
    observed_at: opts.observed_at ?? null,
    fetched_at: opts.fetched_at ?? "2026-07-15T12:00:00.000Z",
    source: opts.source ?? "test",
    evidence: opts.evidence ?? [],
  };
}

function noSignal(max: number, detail: string): SignalResult {
  return signal(0, max, detail, { status: "no_signal", observed_at: null });
}

const PROFILE: BusinessProfile = {
  product_category: "B2B SaaS",
  target_industries: ["Technology"],
  company_size: "51-200",
  buyer_role: "VP Sales",
  sales_motion: "Outbound (cold outreach)",
  deal_size: "$25k-$75k",
  sales_cycle: "30-60 days",
};

describe("deterministic reasoning fallback", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const quietSignals = (): SignalSet => ({
    funding: noSignal(25, "No recent funding found"),
    hiring: noSignal(20, "No recent hiring events found"),
    news: noSignal(20, "No qualifying news found"),
    technology: noSignal(20, "No recent technology adoption found"),
    web: noSignal(15, "No web context found"),
    github: noSignal(20, "No GitHub context found"),
    latestSignalDate: "2026-07-15T12:00:00.000Z",
  });

  it("does not invent a trigger when all verified trigger sources are quiet", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const signals = quietSignals();

    const result = await generateReasoning("Acme", 0, "COLD", signals, "B2B SaaS");

    expect(result.key_triggers).toEqual([]);
    expect(result.ai_summary).toContain("no qualifying time-bound purchase trigger");
    expect(result.ai_summary.toLowerCase()).toContain("finding");
    expect(result.ai_summary.toLowerCase()).not.toMatch(/sorry|unfortunately|failed|error/);
    expect(result.why_now).toMatch(/No dated purchase trigger|quiet/i);
    expect(result.recommended_action.toLowerCase()).toContain("do not cold-call");
    expect(result.talk_track.toLowerCase()).not.toContain("noticed");
    expect(result.used_fallback).toBe(true);
  });

  it("names who to call and cites observed dates on HOT fallback", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const signals: SignalSet = {
      funding: signal(22, 25, "Series B $40M announced", { observed_at: "2026-03-12T00:00:00.000Z" }),
      hiring: signal(16, 20, "Hiring 4 AEs in NYC", { observed_at: "2026-03-01T00:00:00.000Z" }),
      news: signal(4, 20, "Minor press mention", { observed_at: "2026-01-10T00:00:00.000Z" }),
      technology: signal(6, 20, "Added HubSpot", { observed_at: "2025-11-01T00:00:00.000Z" }),
      web: signal(10, 15, "Authority steady", { observed_at: null }),
      github: signal(5, 20, "Public repos quiet", { observed_at: null }),
      latestSignalDate: "2026-03-12T00:00:00.000Z",
    };

    const result = await generateReasoning("Acme", 86, "HOT", signals, "B2B SaaS", true, PROFILE);

    expect(result.recommended_action).toContain("VP Sales");
    expect(result.recommended_action).toMatch(/Call/i);
    expect(result.why_now).toContain("2026-03-12");
    expect(result.key_triggers.some((t) => t.includes("2026-03-12"))).toBe(true);
    expect(result.ai_summary.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
    expect(result.email_subject.length).toBeLessThanOrEqual(80);
  });

  it("aborts a slow AI request and returns the deterministic fallback", async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    ));

    const pending = generateReasoning("Acme", 0, "COLD", quietSignals(), "B2B SaaS");
    await vi.advanceTimersByTimeAsync(12_001);
    const result = await pending;

    expect(result.used_fallback).toBe(true);
    expect(result.key_triggers).toEqual([]);
  });
});
