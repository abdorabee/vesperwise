import { describe, expect, it } from "vitest";

import { repairUiBlocks } from "./gen-ui-repair";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe("repairUiBlocks", () => {
  it("truncates an over-long thesis summary and keeps the block", () => {
    const input = [{ type: "thesis", summary: "a".repeat(4100) }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({ type: "thesis" });
    if (result.blocks[0]?.type !== "thesis") throw new Error("missing thesis");
    expect(result.blocks[0].summary).toHaveLength(4000);
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "thesis",
      code: "truncated",
      path: "summary",
    });
  });

  it("drops only an invalid axis source_url field", () => {
    const input = [{
      type: "signal_explorer",
      axes: [
        { key: "funding", label: "Funding", score: 1, max: 10 },
        { key: "hiring", label: "Hiring", score: 2, max: 10 },
        { key: "news", label: "News", score: 3, max: 10, source_url: "not a url" },
      ],
    }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({ type: "signal_explorer" });
    if (result.blocks[0]?.type !== "signal_explorer") throw new Error("missing explorer");
    expect(result.blocks[0].axes[2]).toEqual({ key: "news", label: "News", score: 3, max: 10 });
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "signal_explorer",
      code: "invalid_prop",
      path: "axes.2.source_url",
    });
  });

  it("removes an invalid optional intent_hero urgency and keeps the hero", () => {
    const input = [{
      type: "intent_hero",
      company: "Acme",
      domain: "acme.com",
      intent_score: 88,
      score_band: "HOT",
      urgency: 42,
    }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toEqual([{
      type: "intent_hero",
      company: "Acme",
      domain: "acme.com",
      intent_score: 88,
      score_band: "HOT",
    }]);
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "intent_hero",
      code: "invalid_prop",
      path: "urgency",
    });
  });

  it("truncates an over-long optional thesis why_now instead of removing it", () => {
    const input = [{ type: "thesis", summary: "Short summary", why_now: "w".repeat(2100) }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toEqual([{ type: "thesis", summary: "Short summary", why_now: "w".repeat(2000) }]);
    expect(result.diagnostics).toContainEqual({ index: 0, type: "thesis", code: "truncated", path: "why_now" });
  });

  it("drops a block when a required field remains invalid after repair", () => {
    const input = [{
      type: "intent_hero",
      company: "Acme",
      domain: "acme.com",
      intent_score: "high",
      score_band: "HOT",
    }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toEqual([]);
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "intent_hero",
      code: "dropped_block",
      path: "",
    });
  });

  it("strips unknown properties and records diagnostics", () => {
    const input = [{ type: "markdown", text: "Keep me", surprise: true }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toEqual([{ type: "markdown", text: "Keep me" }]);
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "markdown",
      code: "unknown_prop",
      path: "surprise",
    });
  });

  it("drops unknown block types", () => {
    const result = repairUiBlocks([{ type: "sparkline", value: 1 }]);

    expect(result.blocks).toEqual([]);
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "sparkline",
      code: "unknown_type",
      path: "type",
    });
  });

  it("records a limit_exceeded diagnostic for the thirteenth block", () => {
    const input = Array.from({ length: 13 }, (_, index) => ({
      type: "markdown",
      text: `Block ${index + 1}`,
    }));

    const result = repairUiBlocks(input);

    expect(result.blocks).toHaveLength(12);
    expect(result.blocks.at(-1)).toEqual({ type: "markdown", text: "Block 12" });
    expect(result.diagnostics).toContainEqual({
      index: 12,
      type: "markdown",
      code: "limit_exceeded",
      path: "",
    });
  });

  it("filters domains outside the allowed account list", () => {
    const input = [{
      type: "intent_hero",
      company: "Outside",
      domain: "outside.com",
      intent_score: 52,
      score_band: "WARM",
    }];

    const result = repairUiBlocks(input, ["acme.com"]);

    expect(result.blocks).toEqual([]);
    expect(result.diagnostics).toContainEqual({
      index: 0,
      type: "intent_hero",
      code: "domain_filtered",
      path: "domain",
    });
  });

  it("never mutates its input while repairing nested values", () => {
    const input = deepFreeze([{
      type: "signal_explorer",
      extra: "strip me",
      axes: [
        { key: "funding", label: "Funding", score: 1, max: 10, source_url: "https://acme.com/funding" },
        { key: "hiring", label: "Hiring", score: 2, max: 10, source_url: "nope" },
      ],
    }]);

    const result = repairUiBlocks(input);

    expect(result.blocks).toEqual([{
      type: "signal_explorer",
      axes: [
        { key: "funding", label: "Funding", score: 1, max: 10, source_url: "https://acme.com/funding" },
        { key: "hiring", label: "Hiring", score: 2, max: 10 },
      ],
    }]);
    expect(input).toEqual([{
      type: "signal_explorer",
      extra: "strip me",
      axes: [
        { key: "funding", label: "Funding", score: 1, max: 10, source_url: "https://acme.com/funding" },
        { key: "hiring", label: "Hiring", score: 2, max: 10, source_url: "nope" },
      ],
    }]);
  });

  // Payload captured from a live copilot present_ui call.
  const liveCopilotPayload = [
    {
      type: "comparison",
      accounts: [
        { domain: "stripe.com", company: "Stripe", intent_score: 58, score_band: "WARM", icp_fit_score: 75, why_now: "Leadership change" },
        { domain: "databricks.com", company: "Databricks", intent_score: 56, score_band: "WARM", urgency: "Medium" },
      ],
    },
    {
      type: "action_rail",
      suggestions: [
        { text: "Draft outreach for Stripe", action: "draft_outreach_email" },
        { text: "Get Stripe signal details", action: "get_company_details" },
      ],
    },
  ];

  it("reports stripped keys inside nested array items", () => {
    const result = repairUiBlocks(liveCopilotPayload);

    expect(result.blocks[0]).toEqual({
      type: "comparison",
      accounts: [
        { company: "Stripe", domain: "stripe.com", intent_score: 58, score_band: "WARM" },
        { company: "Databricks", domain: "databricks.com", intent_score: 56, score_band: "WARM" },
      ],
    });
    const unknown = result.diagnostics.filter((d) => d.code === "unknown_prop").map((d) => d.path);
    expect(unknown).toEqual(["accounts.0.icp_fit_score", "accounts.0.why_now", "accounts.1.urgency"]);
  });

  it("records each unrepairable problem once across repair passes", () => {
    const result = repairUiBlocks(liveCopilotPayload);

    const railDiagnostics = result.diagnostics.filter((d) => d.index === 1);
    const keys = railDiagnostics.map((d) => `${d.code}:${d.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("dropped_block:");
    expect(keys).toContain("invalid_prop:company");
    expect(keys).toContain("invalid_prop:domain");
  });

  it("removes only the invalid array item when it has several bad fields", () => {
    const input = [{
      type: "action_rail",
      company: "Acme",
      domain: "acme.com",
      suggestions: [
        { label: 42, prompt: 42 },
        { label: "Keep me", prompt: "Keep me" },
        { label: "Keep me too", prompt: "Keep me too" },
      ],
    }];

    const result = repairUiBlocks(input);

    expect(result.blocks).toEqual([{
      type: "action_rail",
      company: "Acme",
      domain: "acme.com",
      suggestions: [
        { label: "Keep me", prompt: "Keep me" },
        { label: "Keep me too", prompt: "Keep me too" },
      ],
    }]);
  });
});
