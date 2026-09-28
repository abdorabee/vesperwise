import { describe, expect, it } from "vitest";
import { parseScoreTarget, parseScoreTargets } from "./score-target";

describe("parseScoreTarget", () => {
  it("treats an email as a person", () => {
    expect(parseScoreTarget("Alex@Acme.com")).toEqual({ mode: "person", email: "alex@acme.com" });
  });

  it("strips protocol and www from a domain", () => {
    expect(parseScoreTarget("https://www.Linear.app/pricing")).toEqual({ mode: "domain", domain: "linear.app" });
  });

  it("rejects prose", () => {
    expect(parseScoreTarget("why is that hot")).toEqual({ mode: "unknown" });
  });
});

describe("parseScoreTargets", () => {
  it("collects mixed domains and emails", () => {
    expect(parseScoreTargets("score these: stripe.com, alex@acme.com")).toEqual([
      { mode: "domain", domain: "stripe.com" },
      { mode: "person", email: "alex@acme.com" },
    ]);
  });
});
