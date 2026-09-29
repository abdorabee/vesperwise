import { describe, expect, it } from "vitest";
import { API_KEY_PREFIX, normalizeApiKeyLabel, scoreCurlExample } from "./api-keys";

describe("normalizeApiKeyLabel", () => {
  it("defaults empty or non-string names", () => {
    expect(normalizeApiKeyLabel(undefined)).toBe("Default");
    expect(normalizeApiKeyLabel("   ")).toBe("Default");
    expect(normalizeApiKeyLabel(42)).toBe("Default");
  });

  it("trims, collapses whitespace and caps length", () => {
    expect(normalizeApiKeyLabel("  CRM   sync ")).toBe("CRM sync");
    expect(normalizeApiKeyLabel("x".repeat(100))).toHaveLength(60);
  });
});

describe("scoreCurlExample", () => {
  it("uses the Bearer header and POST body the score route expects", () => {
    const curl = scoreCurlExample("https://app.example.com/");
    expect(curl).toContain("curl -X POST https://app.example.com/api/v1/score");
    expect(curl).toContain(`-H "Authorization: Bearer ${API_KEY_PREFIX}YOUR_KEY"`);
    expect(curl).toContain(`-d '{ "domain": "stripe.com" }'`);
  });

  it("embeds a freshly created key when given one", () => {
    expect(scoreCurlExample("http://localhost:3000", "vesperwise_abc")).toContain("Bearer vesperwise_abc");
  });
});
