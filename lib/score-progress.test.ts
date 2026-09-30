import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSseParser,
  emitProgress,
  formatSseEvent,
  type ScoreProgressEvent,
} from "./score-progress";

describe("getEvidenceSnapshot progress (mock signals)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("emits exactly one signal_done per signal key", async () => {
    vi.stubEnv("MOCK_SIGNALS", "true");
    vi.stubEnv("CACHE_DISABLED", "true");
    vi.resetModules();
    const { getEvidenceSnapshot } = await import("./score-service");
    const events: ScoreProgressEvent[] = [];
    const snapshot = await getEvidenceSnapshot(
      {} as Parameters<typeof getEvidenceSnapshot>[0],
      "acme.io",
      (event) => events.push(event)
    );

    const keys = events.map((event) => (event.type === "signal_done" ? event.key : event.type));
    expect(keys.sort()).toEqual(["funding", "github", "hiring", "news", "technology", "web", "web_activity"]);
    expect(new Set(keys).size).toBe(keys.length);
    const funding = events.find((event) => event.type === "signal_done" && event.key === "funding");
    expect(funding).toMatchObject({ type: "signal_done", source: "mock", detail: snapshot.signals.funding.detail });
  });

  it("keeps scoring alive when the listener throws", async () => {
    vi.stubEnv("MOCK_SIGNALS", "true");
    vi.stubEnv("CACHE_DISABLED", "true");
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getEvidenceSnapshot } = await import("./score-service");
    const snapshot = await getEvidenceSnapshot({} as Parameters<typeof getEvidenceSnapshot>[0], "acme.io", () => {
      throw new Error("listener exploded");
    });
    expect(snapshot.signals.funding).toBeDefined();
    warn.mockRestore();
  });
});

describe("emitProgress", () => {
  it("swallows listener errors", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => emitProgress(() => { throw new Error("x"); }, { type: "reasoning_start" })).not.toThrow();
    warn.mockRestore();
  });
});

describe("SSE framing", () => {
  it("round-trips events across arbitrary chunk boundaries", () => {
    const wire = formatSseEvent("progress", { type: "reasoning_start" }) + formatSseEvent("result", { intent_score: 82 });
    const parse = createSseParser();
    const messages = [wire.slice(0, 7), wire.slice(7, 40), wire.slice(40)].flatMap((chunk) => parse(chunk));
    expect(messages).toEqual([
      { event: "progress", data: JSON.stringify({ type: "reasoning_start" }) },
      { event: "result", data: JSON.stringify({ intent_score: 82 }) },
    ]);
  });

  it("ignores comment keep-alives", () => {
    const parse = createSseParser();
    expect(parse(": ping\n\n")).toEqual([]);
  });
});
