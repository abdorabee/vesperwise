import { describe, expect, it } from "vitest";
import { fillPlaceholderFields, fillPlaceholders } from "./fill-placeholders";

describe("fillPlaceholders", () => {
  it("fills score and company tokens a model left unfilled", () => {
    expect(fillPlaceholders("At {score}/100, {company} is showing warm buying signals", { score: 58, company: "Stripe" }))
      .toBe("At 58/100, Stripe is showing warm buying signals");
  });

  it("is case- and space-tolerant and falls back to the domain for company", () => {
    expect(fillPlaceholders("{ Company } at { SCORE }", { score: 0, domain: "acme.com" })).toBe("acme.com at 0");
  });

  it("leaves tokens it has no value for, and other braces, untouched", () => {
    expect(fillPlaceholders("{company} {other}", {})).toBe("{company} {other}");
  });
});

describe("fillPlaceholderFields", () => {
  it("fills strings and string arrays without mutating the input", () => {
    const input = { ai_summary: "{company} is warm", key_triggers: ["{company} hiring"], urgency: "this-week", n: 1 };
    const out = fillPlaceholderFields(input, { company: "Ramp" });
    expect(out).toEqual({ ai_summary: "Ramp is warm", key_triggers: ["Ramp hiring"], urgency: "this-week", n: 1 });
    expect(input.ai_summary).toBe("{company} is warm");
  });
});
