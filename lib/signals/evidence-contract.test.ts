import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGitHubSignal } from "./github";
import { getMockSignals } from "./mock";
import { fetchWebSignal } from "./web";

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("public signal evidence contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("exposes a public web-presence label and fetch time", async () => {
    vi.stubEnv("OPEN_PAGE_RANK_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response: [{ page_rank_integer: 4, rank: "250000", status_code: 200 }],
      }),
    }));

    const result = await fetchWebSignal("acme.com");

    expect(result.source).toBe("open-page-rank");
    expect(result.detail).toBe("Web presence 4/10");
    expect(result.evidence?.[0]).toMatchObject({
      label: "Web presence 4/10",
      source: "open-page-rank",
      fetched_at: NOW.toISOString(),
      observed_at: NOW.toISOString(),
    });
    expect(JSON.stringify(result)).not.toMatch(/Open PageRank|OpenPageRank|OPR:/);
  });

  it("includes a public organization URL with GitHub evidence", async () => {
    const org = { login: "acme", public_repos: 21, public_members_url: "" };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => org })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => org })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{
          name: "app",
          pushed_at: "2026-07-14T12:00:00.000Z",
          created_at: "2026-07-13T12:00:00.000Z",
        }],
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] }));

    const result = await fetchGitHubSignal("acme.com");

    expect(result.source).toBe("github");
    expect(result.evidence?.length).toBeGreaterThan(0);
    for (const item of result.evidence ?? []) {
      expect(item).toMatchObject({
        source: "github",
        fetched_at: NOW.toISOString(),
        source_url: "https://github.com/acme",
      });
    }
  });

  it("keeps mock signals on the same public evidence schema", () => {
    const signals = getMockSignals("acme.com");

    for (const signal of [
      signals.funding,
      signals.hiring,
      signals.news,
      signals.technology,
      signals.web,
      signals.github,
    ]) {
      expect(signal.source).toBe("mock");
      expect(signal.fetched_at).toBe(NOW.toISOString());
      for (const item of signal.evidence ?? []) {
        expect(item).toMatchObject({ source: "mock", fetched_at: NOW.toISOString() });
      }
    }
  });
});
