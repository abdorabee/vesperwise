import { afterEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() =>
  vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    })),
    upsert,
  }))
);

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ from }),
}));

import {
  cacheGet,
  cacheSet,
  scoreEvidenceCacheKey,
  scoreResultCacheKey,
} from "./cache";

describe("scoring cache isolation", () => {
  it("isolates personalized results across users", () => {
    const first = scoreResultCacheKey("user-a", "example.com", "profile-a", "v2");
    const second = scoreResultCacheKey("user-b", "example.com", "profile-a", "v2");

    expect(first).not.toBe(second);
  });

  it("invalidates personalized results when the profile fingerprint changes", () => {
    const first = scoreResultCacheKey("user-a", "example.com", "profile-a", "v2");
    const second = scoreResultCacheKey("user-a", "example.com", "profile-b", "v2");

    expect(first).not.toBe(second);
  });

  it("keeps workspace-neutral evidence free of user identity", () => {
    const key = scoreEvidenceCacheKey("Example.COM", "signal-evidence-v1");

    expect(key).toBe("score:evidence:signal-evidence-v1:example.com");
    expect(key).not.toContain("user-a");
  });
});

describe("Supabase-backed cache", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    from.mockClear();
    maybeSingle.mockReset();
    upsert.mockReset();
  });

  it("returns cached values that have not expired", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        value: { score: 82 },
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    });

    await expect(cacheGet<{ score: number }>("score:test"))
      .resolves.toEqual({ score: 82 });
  });

  it("returns null for expired rows", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        value: { score: 82 },
        expires_at: new Date(Date.now() - 1_000).toISOString(),
      },
      error: null,
    });

    await expect(cacheGet("score:test")).resolves.toBeNull();
  });

  it("swallows read errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(cacheGet("score:test")).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[cache] read failed",
      { message: "database unavailable" }
    );
  });

  it("upserts values with an expiry timestamp", async () => {
    upsert.mockResolvedValue({ error: null });

    await cacheSet("score:test", { score: 82 }, 60);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "score:test",
        value: { score: 82 },
        expires_at: expect.any(String),
      }),
      { onConflict: "key" }
    );
  });

  it("swallows write errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    upsert.mockResolvedValue({ error: { message: "database unavailable" } });

    await expect(cacheSet("score:test", { score: 82 }, 60))
      .resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "[cache] write failed",
      { message: "database unavailable" }
    );
  });

  it("skips reads and writes when CACHE_DISABLED is true", async () => {
    vi.stubEnv("CACHE_DISABLED", "true");

    await expect(cacheGet("score:test")).resolves.toBeNull();
    await expect(cacheSet("score:test", { score: 82 }, 60))
      .resolves.toBeUndefined();

    expect(from).not.toHaveBeenCalled();
  });
});
