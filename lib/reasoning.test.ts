import { afterEach, describe, expect, it, vi } from "vitest";

import { extractJsonText, generateReasoning, resolveReasoningBindings, withOpenRouterReasoningCap } from "./reasoning";
import type { SignalContribution, SignalResult, SignalSet } from "./types";

const mocks = vi.hoisted(() => {
  const chat = vi.fn((model: string) => ({ provider: "openrouter", model }));
  return {
    chat,
    createOpenAI: vi.fn(() => ({ chat })),
    streamText: vi.fn(),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mocks.createOpenAI,
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: mocks.streamText,
  };
});

function noSignal(max: number, detail: string): SignalResult {
  return {
    score: 0,
    max,
    detail,
    status: "no_signal",
    observed_at: null,
    fetched_at: "2026-07-15T12:00:00.000Z",
    source: "test",
    evidence: [],
  };
}

function okSignal(max: number, detail: string, observedAt = "2026-10-01T12:00:00.000Z"): SignalResult {
  return {
    score: Math.round(max * 0.8),
    max,
    detail,
    status: "ok",
    observed_at: observedAt,
    fetched_at: "2026-10-02T12:00:00.000Z",
    source: "test",
    evidence: [],
  };
}

const contributions: SignalContribution[] = [
  {
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
  },
  {
    type: "funding",
    status: "no_signal",
    rawScore: 0,
    decayedScore: 0,
    freshness: 0,
    daysAgo: null,
    summary: "No recent funding",
    baseWeight: 22,
    effectiveWeight: 22,
    contribution: 0,
    observedAt: null,
    halfLifeDays: 30,
  },
];

async function* streamChunks(chunks: string[]) {
  for (const text of chunks) {
    yield { type: "text-delta" as const, text };
  }
}

describe("deterministic reasoning fallback", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
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

  const liveSignals = (): SignalSet => ({
    funding: noSignal(25, "No recent funding found"),
    hiring: okSignal(20, "Hiring revenue operations leaders"),
    news: noSignal(20, "No qualifying news found"),
    technology: noSignal(20, "No recent technology adoption found"),
    web: noSignal(15, "No web context found"),
    github: noSignal(20, "No GitHub context found"),
    latestSignalDate: "2026-10-02T12:00:00.000Z",
  });

  it("streams partial JSON briefs and returns the final model reasoning", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      now += 300;
      return now;
    });
    const chunks = [
      `{"brief":{"version":1,"headline":"Acme is HOT for a focused revenue motion","layout":[{"type":"score_hero"},{"type":"timing_slider","note":"{company} is {band} at {score}."}`,
      `,{"type":"why_now","text":"Lead with {signal.hiring.detail} before it gets stale."}`,
      `,{"type":"opener_picker","default_angle":"hiring","default_persona":"VP Sales"}`,
      `,{"type":"next_steps","actions":[{"label":"Draft email","prompt":"Write to {persona} at {company} using {angle}."}]}]`,
      `,"personas":["VP Sales","CRO"],"openers":{"hiring":{"VP Sales":"Saw {signal.hiring.detail}. Worth a quick look?","CRO":"Hiring like this usually pressures forecasting."}}}`,
      `,"ai_summary":"Acme is ready for targeted outreach.","buying_stage":"decision","urgency":"act-now"`,
      `,"why_now":"Hiring creates a near-term window.","recommended_action":"Lead with hiring momentum.","email_subject":"Revenue hiring at Acme"`,
      `,"talk_track":"I noticed the revenue operations hiring and wanted to ask how you are handling the added volume.","key_triggers":["Hiring revenue operations leaders"]}`,
    ];
    mocks.streamText.mockReturnValue({ fullStream: streamChunks(chunks) });
    const onBrief = vi.fn();

    const result = await generateReasoning("Acme", 82, "HOT", liveSignals(), "Sales intelligence", true, null, {
      contributions,
      onBrief,
    });

    expect(mocks.streamText).toHaveBeenCalledTimes(1);
    expect(mocks.chat).toHaveBeenCalledWith("google/gemini-3.5-flash");
    const call = mocks.streamText.mock.calls[0][0] as Record<string, unknown>;
    expect(call.maxOutputTokens).toBeGreaterThanOrEqual(1800);
    expect(String(call.prompt ?? "")).toContain("BRIEF CATALOG");
    expect(String(call.prompt ?? "")).toContain("Respond in strict JSON only");
    expect(String(call.prompt ?? "")).toContain("never type a number for score, age, or points");

    const streamedLayouts = onBrief.mock.calls.map(([spec]) => spec.layout.map((section: { type: string }) => section.type));
    expect(streamedLayouts.length).toBeGreaterThanOrEqual(2);
    expect(streamedLayouts[0].length).toBeGreaterThanOrEqual(2);
    expect(streamedLayouts.at(-1)).toContain("next_steps");
    expect(result).toMatchObject({
      ai_summary: "Acme is ready for targeted outreach.",
      buying_stage: "decision",
      urgency: "act-now",
      why_now: "Hiring creates a near-term window.",
      recommended_action: "Lead with hiring momentum.",
      email_subject: "Revenue hiring at Acme",
      talk_track: "I noticed the revenue operations hiring and wanted to ask how you are handling the added volume.",
      key_triggers: ["Hiring revenue operations leaders"],
      model_tier: "premium",
      used_fallback: false,
    });
    expect(result.brief.layout.map((section) => section.type)).toContain("next_steps");
  });

  it("accepts a model response wrapped in a json code fence", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const body = JSON.stringify({
      brief: {
        version: 1,
        headline: "Acme is ready now",
        layout: [{ type: "score_hero" }, { type: "timing_slider" }],
        personas: ["VP Sales"],
        openers: {},
      },
      ai_summary: "Acme is ready for targeted outreach.",
      buying_stage: "decision",
      urgency: "act-now",
      why_now: "Hiring creates a near-term window.",
      recommended_action: "Lead with hiring momentum.",
      email_subject: "Revenue hiring at Acme",
      talk_track: "I noticed the hiring and wanted to ask how you handle the added volume.",
      key_triggers: ["Hiring revenue operations leaders"],
    });
    mocks.streamText.mockReturnValue({ fullStream: streamChunks(["Here you go:\n```json\n", body.slice(0, 80), body.slice(80), "\n```"]) });

    const result = await generateReasoning("Acme", 82, "HOT", liveSignals(), "Sales intelligence", true, null, { contributions });

    expect(result.used_fallback).toBe(false);
    expect(result.brief.headline).toBe("Acme is ready now");
  });

  it("caps OpenRouter reasoning so it cannot eat the JSON budget", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));

    await withOpenRouterReasoningCap("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: "google/gemini-3.5-flash", max_tokens: 4000 }),
    });

    const sent = JSON.parse(String(spy.mock.calls[0][1]?.body));
    expect(sent).toMatchObject({ model: "google/gemini-3.5-flash", max_tokens: 4000, reasoning: { max_tokens: 400 } });
    spy.mockRestore();
  });

  it("fills brief bindings that leak into the plain-text reasoning fields", () => {
    const result = resolveReasoningBindings({
      ai_summary: "At {score}/100, {company} is {band}; driver: {signal.hiring.detail}.",
      recommended_action: "Call {company} this week.",
      buying_stage: "consideration",
      urgency: "this-week",
      key_triggers: ["{signal.hiring.detail}"],
      why_now: "Hiring is fresh.",
      email_subject: "Hiring at {company}",
      talk_track: "Saw {unknown.ref} the news.",
    }, {
      company: "Acme",
      score: 67,
      band: "WARM",
      contributions: [{ type: "hiring", rawScore: 80, effectiveWeight: 19, daysAgo: 10, observedAt: null, summary: "6 open RevOps roles", contribution: 15, status: "ok" }],
    });

    expect(result.ai_summary).toBe("At 67/100, Acme is WARM; driver: 6 open RevOps roles.");
    expect(result.recommended_action).toBe("Call Acme this week.");
    expect(result.key_triggers).toEqual(["6 open RevOps roles"]);
    expect(result.email_subject).toBe("Hiring at Acme");
    expect(result.talk_track).toBe("Saw the news.");
  });

  it("extracts the object from fenced or prefixed model text", () => {
    expect(extractJsonText("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
    expect(extractJsonText("Sure! {\"a\":1")).toBe('{"a":1');
    expect(extractJsonText("no object here")).toBe("");
  });

  it("does not invent a trigger when all verified trigger sources are quiet", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const signals = quietSignals();
    const onBrief = vi.fn();

    const result = await generateReasoning("Acme", 0, "COLD", signals, "B2B SaaS", true, null, {
      contributions,
      onBrief,
    });

    expect(result.key_triggers).toEqual([]);
    expect(result.ai_summary).toContain("no qualifying time-bound purchase trigger");
    expect(result.why_now).toContain("No verified time-bound trigger");
    expect(result.talk_track.toLowerCase()).not.toContain("noticed");
    expect(result.used_fallback).toBe(true);
    expect(result.brief.layout.length).toBeGreaterThanOrEqual(2);
    expect(onBrief).toHaveBeenCalledTimes(1);
    expect(onBrief).toHaveBeenCalledWith(result.brief);
  });

  it("aborts a slow AI request and returns the deterministic fallback", async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    let abortSignal: AbortSignal | undefined;
    mocks.streamText.mockImplementation((call: { abortSignal?: AbortSignal }) => {
      abortSignal = call.abortSignal;
      return {
        fullStream: (async function* () {
          await new Promise<void>((_resolve, reject) => {
            call.abortSignal?.addEventListener("abort", () => reject(new Error("aborted")));
          });
        })(),
      };
    });
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    ));
    const onBrief = vi.fn();

    const pending = generateReasoning("Acme", 0, "COLD", quietSignals(), "B2B SaaS", true, null, {
      contributions,
      onBrief,
    });
    await vi.advanceTimersByTimeAsync(30_001);
    const result = await pending;

    expect(abortSignal?.aborted).toBe(true);
    expect(result.used_fallback).toBe(true);
    expect(result.key_triggers).toEqual([]);
    expect(result.brief.layout.length).toBeGreaterThanOrEqual(2);
    expect(onBrief).toHaveBeenCalledTimes(1);
  });

  it("keeps valid model reasoning but falls back when the model brief is unusable", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    mocks.streamText.mockReturnValue({
      fullStream: streamChunks([
        JSON.stringify({
          brief: { version: 1, headline: "", layout: [], personas: [], openers: {} },
          ai_summary: "Model summary survives.",
          buying_stage: "consideration",
          urgency: "this-week",
          why_now: "Model why now survives.",
          recommended_action: "Model action survives.",
          email_subject: "Model subject",
          talk_track: "Model talk track survives.",
          key_triggers: ["Hiring revenue operations leaders"],
        }),
      ]),
    });
    const onBrief = vi.fn();

    const result = await generateReasoning("Acme", 64, "WARM", liveSignals(), "Sales intelligence", false, null, {
      contributions,
      onBrief,
    });

    expect(result.used_fallback).toBe(false);
    expect(result.ai_summary).toBe("Model summary survives.");
    expect(result.brief.headline).toContain("Acme is WARM");
    expect(result.brief.layout.length).toBeGreaterThanOrEqual(2);
    expect(onBrief).toHaveBeenCalledWith(result.brief);
  });
});
