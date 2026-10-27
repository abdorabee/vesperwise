import { comparePlans, type PlanKey } from "@/lib/billing-plans";
import { isPlanKey } from "@/lib/plan-features";

export interface PricingCardState {
  label: string;
  href: string;
  current: boolean;
  included: boolean;
}

export function pricingCardState(input: {
  card: PlanKey;
  currentPlan: string | null;
  signedIn: boolean;
  granted: boolean;
  signedOutLabel: string;
  signedOutHref: string;
}): PricingCardState {
  const current = input.signedIn && isPlanKey(input.currentPlan) ? input.currentPlan : null;
  if (!current) {
    return {
      label: input.signedOutLabel,
      href: input.signedOutHref,
      current: false,
      included: false,
    };
  }
  if (input.card === current) {
    return {
      label: input.granted ? "Current (Granted)" : "Current plan",
      href: "/billing",
      current: true,
      included: false,
    };
  }
  if (input.granted) {
    return {
      label: "Not your plan",
      href: input.card === "agency" ? "/contact#contact-form" : "/billing",
      current: false,
      included: false,
    };
  }
  if (comparePlans(input.card, current) < 0) {
    return { label: "Included", href: "/billing", current: false, included: true };
  }
  if (input.card === "agency") {
    return { label: "Contact us", href: "/contact#contact-form", current: false, included: false };
  }
  return { label: "Upgrade", href: "/billing", current: false, included: false };
}
