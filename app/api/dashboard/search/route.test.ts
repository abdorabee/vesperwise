import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const orFilters: string[] = [];
const ilikeFilters: string[] = [];

function chain(): Record<string, unknown> {
  const self: Record<string, unknown> = {};
  const passthrough = () => self;
  Object.assign(self, {
    select: passthrough,
    eq: passthrough,
    order: passthrough,
    limit: async () => ({ data: [] }),
    or: (filter: string) => {
      orFilters.push(filter);
      return self;
    },
    ilike: (_column: string, pattern: string) => {
      ilikeFilters.push(pattern);
      return self;
    },
  });
  return self;
}

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: () => ({ from: () => chain() }) }));

const { GET } = await import("./route");

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
  orFilters.length = 0;
  ilikeFilters.length = 0;
});

describe("GET /api/dashboard/search", () => {
  it("neutralises PostgREST syntax characters in q before building filters", async () => {
    const q = encodeURIComponent("zz),user_id.neq.x,(a");

    const res = await GET(new NextRequest(`http://localhost/api/dashboard/search?q=${q}`));

    expect(res.status).toBe(200);
    expect(orFilters.length).toBeGreaterThan(0);
    for (const filter of orFilters) {
      // Only the template's own commas and parens may remain: 3 clauses max per filter.
      expect(filter.split(",").length).toBeLessThanOrEqual(3);
      expect(filter).not.toContain("),user_id");
      expect(filter).not.toMatch(/\(/);
    }
    expect(ilikeFilters[0]).not.toMatch(/[,()]/);
  });

  it("returns empty results for syntax-only queries", async () => {
    const res = await GET(new NextRequest("http://localhost/api/dashboard/search?q=%2C%28%29"));

    await expect(res.json()).resolves.toEqual({ companies: [], people: [], watchlist: [], lists: [] });
    expect(orFilters).toHaveLength(0);
  });
});
