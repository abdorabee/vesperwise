import { describe, expect, it } from "vitest";
import { renewalDisclosure } from "./billing-plans";

describe("renewalDisclosure", () => {
  it("states the price, automatic renewal, and how to cancel for a paid plan", () => {
    const text = renewalDisclosure(29);
    expect(text).toContain("$29/mo");
    expect(text).toMatch(/renews automatically/i);
    expect(text).toMatch(/until you cancel/i);
    expect(text).toMatch(/cancel anytime in Billing/i);
  });

  it("returns null for the free plan", () => {
    expect(renewalDisclosure(0)).toBeNull();
  });
});
