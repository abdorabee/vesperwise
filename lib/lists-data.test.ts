import { beforeEach, describe, expect, it, vi } from "vitest";

interface Call {
  table: string;
  method: string;
  args: unknown[];
}

const calls: Call[] = [];
let results: Record<string, { data: unknown; error?: { code?: string; message: string } | null }> = {};

function builder(table: string): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop: string) {
        const result = () => results[table] ?? { data: [], error: null };
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result());
        if (prop === "maybeSingle" || prop === "single") {
          return async () => {
            const r = result();
            return { ...r, data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data };
          };
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: () => ({ from: (t: string) => builder(t) }) }));

const { buildListsOverview, ensureDefaultList, fetchListMembers } = await import("./lists-data");

const callsTo = (table: string, method?: string) =>
  calls.filter((c) => c.table === table && (!method || c.method === method));

function listRow(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    user_id: "u1",
    name: id,
    description: null,
    list_type: "manual",
    color: "#fff",
    icon_initials: null,
    rules: null,
    auto_refresh: false,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  calls.length = 0;
  results = {};
});

describe("ensureDefaultList", () => {
  it("does nothing when the system list already exists", async () => {
    results.lists = { data: [{ id: "sys" }] };

    await ensureDefaultList("u1");

    expect(callsTo("lists", "insert")).toHaveLength(0);
  });

  it("creates one system list when missing, regardless of other lists", async () => {
    results.lists = { data: [], error: null };

    await ensureDefaultList("u1");

    const inserts = callsTo("lists", "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].args[0]).toMatchObject({ user_id: "u1", is_system: true, name: "My Watchlist" });
    expect(callsTo("list_members")).toHaveLength(0);
  });

  it("tolerates a concurrent create (unique violation)", async () => {
    results.lists = { data: [], error: { code: "23505", message: "duplicate" } };

    await expect(ensureDefaultList("u1")).resolves.toBeUndefined();
  });
});

describe("system list members", () => {
  it("derive from the active watchlist and never read list_members", async () => {
    results.watchlist = { data: [{ domain: "A.com", company_name: "A", last_scored: null }] };

    const members = await fetchListMembers("sys", "u1", { is_system: true });

    expect(members.map((m) => m.domain)).toEqual(["a.com"]);
    expect(callsTo("list_members")).toHaveLength(0);
    expect(callsTo("watchlist", "eq").map((c) => c.args)).toContainEqual(["user_id", "u1"]);
  });
});

describe("buildListsOverview", () => {
  it("fetches all manual members in one query and scopes it to the user", async () => {
    results.lists = { data: [listRow("l1"), listRow("l2"), listRow("l3"), listRow("sys", { is_system: true })] };
    results.list_members = { data: [] };
    results.watchlist = { data: [{ domain: "a.com", company_name: "A", last_scored: null }] };
    results.scores = { data: [] };

    const { summaries, hero } = await buildListsOverview("u1");

    expect(callsTo("list_members", "select")).toHaveLength(1);
    expect(callsTo("list_members", "in")[0].args).toEqual(["list_id", ["l1", "l2", "l3"]]);
    expect(callsTo("list_members", "eq").map((c) => c.args)).toContainEqual(["user_id", "u1"]);
    expect(summaries.find((s) => s.id === "sys")).toMatchObject({ isSystem: true, accountCount: 1 });
    expect(hero.totalAccounts).toBe(1);
  });

  it("selects only the columns it needs from scores", async () => {
    results.lists = { data: [] };

    await buildListsOverview("u1");

    const select = callsTo("scores", "select")[0].args[0] as string;
    expect(select).not.toBe("*");
  });
});
