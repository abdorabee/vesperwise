import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdmin: vi.fn(),
  resolveDataRefs: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: mocks.createSupabaseAdmin,
}));

vi.mock("@/lib/sandbox-data", () => ({
  resolveDataRefs: mocks.resolveDataRefs,
}));

function singleRowSupabase(row: Record<string, unknown> | null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: row, error: row ? null : { message: "not found" } })),
  };
  return { from: vi.fn(() => chain), chain };
}

describe("build_interactive_tool copilot contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseAdmin.mockReturnValue({ from: vi.fn() });
    mocks.resolveDataRefs.mockResolvedValue({ "account:notion.so": { signals: { funding: {}, hiring: {} } } });
  });

  it("declares the streaming JSON-schema properties in contract order", async () => {
    const { COPILOT_TOOLS } = await import("./copilot");
    const definition = COPILOT_TOOLS.find((tool) => tool.function.name === "build_interactive_tool");

    expect(definition?.function.description).toContain(
      "renders a sandboxed interactive tool (calculator, chart, diagram) in the chat; data comes ONLY via data_refs → window.VW_DATA; fields stream in order",
    );
    expect(Object.keys((definition?.function.parameters.properties ?? {}) as Record<string, unknown>)).toEqual([
      "title",
      "initialHeight",
      "placeholderMessages",
      "data_refs",
      "css",
      "html",
      "jsFunctions",
      "jsExpressions",
    ]);
    expect(definition?.function.parameters.required).toEqual(["title", "html"]);
  });

  it("validates size caps before resolving data refs", async () => {
    const { executeTool } = await import("./copilot");

    await expect(executeTool(
      "build_interactive_tool",
      { title: "Huge", html: "x".repeat(60_001) },
      "user_1",
      "B2B SaaS",
      null,
    )).resolves.toMatchObject({ error: expect.stringContaining("html") });
    expect(mocks.resolveDataRefs).not.toHaveBeenCalled();
  });

  it("returns resolved data with a compact data summary", async () => {
    const supabase = { from: vi.fn() };
    mocks.createSupabaseAdmin.mockReturnValue(supabase);
    mocks.resolveDataRefs.mockResolvedValue({
      "account:notion.so": { signals: { funding: {}, hiring: {}, news: {}, technology: {} } },
      pipeline: { total: 3 },
    });
    const { executeTool } = await import("./copilot");

    await expect(executeTool(
      "build_interactive_tool",
      { title: "ROI", html: "<section>ROI</section>", data_refs: ["account:notion.so", "pipeline"] },
      "user_1",
      "B2B SaaS",
      null,
    )).resolves.toEqual({
      ok: true,
      title: "ROI",
      data: {
        "account:notion.so": { signals: { funding: {}, hiring: {}, news: {}, technology: {} } },
        pipeline: { total: 3 },
      },
      data_summary: ["account:notion.so -> 4 signals", "pipeline -> 3 accounts"],
    });
    expect(mocks.resolveDataRefs).toHaveBeenCalledWith(supabase, "user_1", ["account:notion.so", "pipeline"]);
  });
});

describe("get_company_details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns brief contributions for the user's latest stored score", async () => {
    const supabase = singleRowSupabase({
      company_name: "Notion",
      domain: "notion.so",
      score: 84,
      score_band: "HOT",
      signals: {},
      contributions: [{
        type: "funding",
        status: "ok",
        rawScore: 80,
        decayedScore: 76,
        freshness: 0.9,
        daysAgo: 2,
        summary: "BuiltWith Free API and OpenRouter should not leak",
        baseWeight: 25,
        effectiveWeight: 25,
        contribution: 20,
        observedAt: "2026-10-05T00:00:00.000Z",
      }],
      created_at: "2026-10-08T00:00:00.000Z",
    });
    mocks.createSupabaseAdmin.mockReturnValue(supabase);
    const { executeTool } = await import("./copilot");

    await expect(executeTool("get_company_details", { domain: "notion.so" }, "user_1", "B2B SaaS", null))
      .resolves.toMatchObject({
        company: "Notion",
        domain: "notion.so",
        contributions: [{
          type: "funding",
          summary: "public data and public data should not leak",
        }],
      });
  });
});
