import { describe, expect, it } from "vitest";
import { isMockSource, sourceLabel, stripMockMarker } from "./source-labels";

describe("sourceLabel", () => {
  it.each([
    ["scrapling", "Company careers page"],
    ["careers", "Company careers page"],
    ["explorium", "Company records"],
    ["explorium-events", "Hiring activity"],
    ["hiring", "Hiring activity"],
    ["gnews", "News coverage"],
    ["news", "News coverage"],
    ["builtwith", "Technology profile"],
    ["technology", "Technology profile"],
    ["open-page-rank", "Web presence"],
    ["web", "Web presence"],
    ["github", "GitHub"],
    ["firecrawl", "Company website"],
    ["firecrawl-change-tracking", "Company website changes"],
    ["website", "Company website"],
    ["treg-aviato", "Funding records"],
    ["treg-predictleads", "Company records"],
    ["treg-akta", "News coverage"],
    ["treg-hunter", "Company records"],
    ["company", "Company records"],
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
