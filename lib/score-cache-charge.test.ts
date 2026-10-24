import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCORING_VERSION } from "@/lib/scorer";

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ rpc, from }),
}));

vi.mock("@/lib/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cache")>();
  return {
    ...actual,
    cacheGet: vi.fn(async () => storedScore()),
    cacheSet: vi.fn(),
  };
});

function signal(key: string) {
  return {
    score: 5,
    max: key === "funding" ? 25 : 20,
    detail: `${key} ok`,
    status: "ok",
    observed_at: "2026-10-01T00:00:00.000Z",
    fetched_at: "2026-10-02T12:00:00.000Z",
    source: "primary",
    evidence: [],
    metadata: {},
  };
}

function storedScore() {
  return {
    scoring_version: SCORING_VERSION,
    score_status: "complete",
    domain: "acme.com",
    company: "Acme",
    intent_score: 72,
    score_band: "WARM",
    charged: true,
    cached: false,
    signals: {
      funding: signal("funding"),
      hiring: signal("hiring"),
      news: signal("news"),
      technology: signal("technology"),
      web: { ...signal("web"), max: 15 },
      github: signal("github"),
      latestSignalDate: "2026-10-01T00:00:00.000Z",
    },
  };
}

describe("cached rescore", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    vi.stubEnv("SCORING_V3_ENABLED", "false");
  });

  it("costs 0 credits and writes no debit row", async () => {
    const { scoreCompany } = await import("./score-service");
    const result = await scoreCompany({ domain: "acme.com", userId: "user_1" });

    expect(result.cached).toBe(true);
    expect(result.charged).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
