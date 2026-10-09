import posthog from "posthog-js";

import { readCookieConsent } from "@/lib/cookie-consent";

export const PRODUCT_EVENTS = [
  "signup_completed",
  "score_started",
  "score_completed",
  "checkout_started",
] as const;

export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

export function posthogProjectKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function posthogApiHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
}

/** Captures a funnel event only after cookie Accept and a live PostHog init. */
export function captureProductEvent(event: ProductEvent) {
  if (typeof window === "undefined") return;
  if (!posthogProjectKey()) return;
  if (readCookieConsent() !== "granted") return;
  if (!posthog.__loaded || posthog.has_opted_out_capturing()) return;
  posthog.capture(event);
}
