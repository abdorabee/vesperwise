import { describe, expect, it } from "vitest";
import { isMockSource, sourceLabel, stripMockMarker } from "./source-labels";

describe("sourceLabel", () => {
  it.each([
    ["scrapling", "Company careers page"],
    ["explorium", "Explorium business data"],
    ["explorium-events", "Explorium business events"],
    ["gnews", "News coverage"],
    ["builtwith", "BuiltWith"],
    ["open-page-rank", "Open PageRank"],
    ["github", "GitHub"],
    ["firecrawl", "Company website"],
    ["mock", "Sample data"],
  ])("maps %s to %s", (id, label) => {
    expect(sourceLabel(id)).toBe(label);
  });

  it("is case and whitespace tolerant", () => {
    expect(sourceLabel("  GNews ")).toBe("News coverage");
  });

  it("title-cases unknown provider ids instead of leaking them raw", () => {
    expect(sourceLabel("some-new_provider")).toBe("Some New Provider");
  });

  it("returns null for empty input", () => {
    expect(sourceLabel(undefined)).toBeNull();
    expect(sourceLabel("")).toBeNull();
  });
});

describe("mock helpers", () => {
  it("detects the mock provider", () => {
    expect(isMockSource("mock")).toBe(true);
    expect(isMockSource("gnews")).toBe(false);
  });

  it("strips the MOCK suffix from details", () => {
    expect(stripMockMarker("Series B closed 42 days ago ($22M) — MOCK")).toBe("Series B closed 42 days ago ($22M)");
    expect(stripMockMarker("No change")).toBe("No change");
  });
});
