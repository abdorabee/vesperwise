import { describe, expect, it } from "vitest";
import { pricingCardState } from "@/lib/pricing-cta";

describe("pricingCardState", () => {
  it("marks the granted agency card and treats sold plans as included", () => {
    expect(pricingCardState({
      card: "agency",
      currentPlan: "agency",
      signedIn: true,
      granted: true,
      signedOutLabel: "Contact us",
      signedOutHref: "/contact#contact-form",
    })).toMatchObject({ label: "Current (Granted)", href: "/billing", current: true });

    expect(pricingCardState({
      card: "pro",
      currentPlan: "agency",
      signedIn: true,
      granted: true,
      signedOutLabel: "Choose Pro",
      signedOutHref: "/signup",
    })).toMatchObject({ label: "Included", included: true });
  });

  it("offers upgrade only above the current plan", () => {
    expect(pricingCardState({
      card: "growth",
      currentPlan: "plus",
      signedIn: true,
      granted: false,
      signedOutLabel: "Choose Growth",
      signedOutHref: "/signup",
    }).label).toBe("Upgrade");

    expect(pricingCardState({
      card: "starter",
      currentPlan: "plus",
      signedIn: true,
      granted: false,
      signedOutLabel: "Choose Starter",
      signedOutHref: "/signup",
    }).label).toBe("Included");

    expect(pricingCardState({
      card: "agency",
      currentPlan: "plus",
      signedIn: true,
      granted: false,
      signedOutLabel: "Contact us",
      signedOutHref: "/contact#contact-form",
    })).toMatchObject({ label: "Contact us", href: "/contact#contact-form" });
  });

  it("keeps the public calls to action when signed out", () => {
    expect(pricingCardState({
      card: "free",
      currentPlan: null,
      signedIn: false,
      granted: false,
      signedOutLabel: "Start free",
      signedOutHref: "/signup",
    })).toMatchObject({ label: "Start free", href: "/signup", current: false });
  });
});
