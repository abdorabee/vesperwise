import { describe, expect, it } from "vitest";
import { classifyComposerInput, composerHelper, composerPlaceholder, resolveInitialDomainIntent, scoreActionLabel } from "./score-intent";

const params = (query: string) => new URLSearchParams(query);

describe("resolveInitialDomainIntent", () => {
  it("returns none without a domain", () => {
    expect(resolveInitialDomainIntent(params("")).kind).toBe("none");
  });
  it("pre-fills instead of scoring for ?domain=", () => {
    expect(resolveInitialDomainIntent(params("domain=https://www.Stripe.com/x"))).toEqual({ kind: "prefill", domain: "stripe.com" });
  });
  it("opens the stored result for view=last", () => {
    expect(resolveInitialDomainIntent(params("domain=stripe.com&view=last"))).toEqual({ kind: "last", domain: "stripe.com" });
  });
  it("flags an invalid domain", () => {
    expect(resolveInitialDomainIntent(params("domain=not%20a%20domain")).kind).toBe("invalid");
  });
});

describe("classifyComposerInput", () => {
  it("scores domains in either mode", () => {
    expect(classifyComposerInput("stripe.com", false)).toEqual({ kind: "score", domain: "stripe.com" });
    expect(classifyComposerInput("stripe.com", true)).toEqual({ kind: "score", domain: "stripe.com" });
  });
  it("rejects non-domains without an active thread", () => {
    expect(classifyComposerInput("Stripe", false).kind).toBe("invalid");
    expect(classifyComposerInput("tell me about stripe", false).kind).toBe("invalid");
  });
  it("allows follow-ups with an active thread", () => {
    expect(classifyComposerInput("why now?", true)).toEqual({ kind: "follow_up" });
  });
  it("treats blank input as empty", () => {
    expect(classifyComposerInput("  ", true).kind).toBe("empty");
  });
});

describe("composer copy", () => {
  it("reflects the mode", () => {
    expect(composerHelper(false, null)).toBe("Enter a company domain · 1 credit");
    expect(composerHelper(true, "Stripe")).toBe("Ask a follow-up about Stripe · 0.25 credits");
    expect(composerPlaceholder("Stripe")).toBe("Ask a follow-up about Stripe");
    expect(composerPlaceholder(null)).toBe("Enter a company domain");
  });
  it("labels the confirm action with the domain and cost", () => {
    expect(scoreActionLabel("stripe.com")).toBe("Score stripe.com · 1 credit");
  });
});
