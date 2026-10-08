import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BILLING_PLANS } from "@/lib/billing-plans";
import { BillingPlansGrid } from "./billing-plans-grid";

function renewalIds(html: string): string[] {
  return [...html.matchAll(/id="renewal-([a-z]+)"/g)].map((m) => m[1]);
}

describe("BillingPlansGrid renewal disclosure", () => {
  it("shows renewal terms next to every self-serve upgrade button for a free user", () => {
    const html = renderToStaticMarkup(<BillingPlansGrid currentPlan="free" />);
    const upgradeable = BILLING_PLANS.filter((p) => p.price > 0 && p.key !== "agency").map((p) => p.key);

    expect(renewalIds(html)).toEqual(upgradeable);
    for (const key of upgradeable) {
      expect(html).toContain(`aria-describedby="renewal-${key}"`);
    }
    expect(html).toMatch(/Renews automatically at \$\d+\/mo until you cancel/);
  });

  it("omits the disclosure for the current plan, downgrades and talk-to-sales", () => {
    const html = renderToStaticMarkup(<BillingPlansGrid currentPlan="pro" />);
    expect(renewalIds(html)).toEqual([]);
  });
});
