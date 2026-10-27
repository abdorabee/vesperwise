import { describe, expect, it } from "vitest";
import { pricingCardState } from "@/lib/pricing-cta";

describe("pricingCardState", () => {
  it("marks the granted agency card and labels every other card Not your plan", () => {
    expect(pricingCardState({
      card: "agency",
      currentPlan: "agency",
      signedIn: true,
      granted: true,
      signedOutLabel: "Contact us",
      signedOutHref: "/contact#contact-form",
    })).toMatchObject({ label: "Current (Granted)", href: "/billing", current: true });

    for (const card of ["free", "starter", "plus", "growth", "pro"] as const) {
      expect(pricingCardState({
        card,
        currentPlan: "agency",
        signedIn: true,
        granted: true,
        signedOutLabel: "Choose Pro",
        signedOutHref: "/signup",
      })).toMatchObject({ label: "Not your plan", href: "/billing", current: false, included: false });
    }
  });

  it("keeps contact and billing hrefs for the other cards on a granted plan", () => {
    expect(pricingCardState({
      card: "pro",
      currentPlan: "growth",
      signedIn: true,
      granted: true,
      signedOutLabel: "Choose Pro",
      signedOutHref: "/signup",
    })).toMatchObject({ label: "Not your plan", href: "/billing" });

    expect(pricingCardState({
      card: "agency",
      currentPlan: "growth",
      signedIn: true,
      granted: true,
      signedOutLabel: "Contact us",
      signedOutHref: "/contact#contact-form",
    })).toMatchObject({ label: "Not your plan", href: "/contact#contact-form", current: false });

    expect(pricingCardState({
      card: "growth",
      currentPlan: "growth",
      signedIn: true,
      granted: true,
      signedOutLabel: "Choose Growth",
      signedOutHref: "/signup",
    })).toMatchObject({ label: "Current (Granted)", href: "/billing", current: true });
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
