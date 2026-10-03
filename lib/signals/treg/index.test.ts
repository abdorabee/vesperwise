import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SignalResult } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  funding: vi.fn(),
  hiring: vi.fn(),
  technology: vi.fn(),
  news: vi.fn(),
}));

vi.mock("./funding", () => ({ fetchTregFundingSignal: mocks.funding }));
vi.mock("./hiring", () => ({ fetchTregHiringSignal: mocks.hiring }));
vi.mock("./technology", () => ({ fetchTregTechnologySignal: mocks.technology }));
vi.mock("./news", () => ({ fetchTregNewsSignal: mocks.news }));

import { fetchTregFallbackSignal } from "./index";

function signalFor(source: string): SignalResult {
  return {
    score: 0,
    max: 20,
    detail: source,
    status: "no_signal",
    observed_at: null,
    fetched_at: "2026-10-02T12:00:00.000Z",
    source,
    evidence: [],
  };
}

describe("fetchTregFallbackSignal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["funding", "treg-aviato", mocks.funding],
    ["hiring", "treg-predictleads", mocks.hiring],
    ["technology", "treg-predictleads", mocks.technology],
    ["news", "treg-akta", mocks.news],
  ])("dispatches %s to the matching Treg signal mapper", async (key, source, fetcher) => {
    const expected = signalFor(source);
    fetcher.mockResolvedValueOnce(expected);
    const controller = new AbortController();

    const result = await fetchTregFallbackSignal(key, "acme.com", controller.signal);

    expect(result).toBe(expected);
    expect(fetcher).toHaveBeenCalledWith("acme.com", controller.signal);
  });

  it.each([
    "firmographics",
    "web",
    "github",
    "web_activity",
    "unknown",
  ])("returns null for non-signal fallback key %s", async (key) => {
    const result = await fetchTregFallbackSignal(key, "acme.com");

    expect(result).toBeNull();
    expect(mocks.funding).not.toHaveBeenCalled();
    expect(mocks.hiring).not.toHaveBeenCalled();
    expect(mocks.technology).not.toHaveBeenCalled();
    expect(mocks.news).not.toHaveBeenCalled();
  });
});
