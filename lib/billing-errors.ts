/** Short codes carried in `/billing?error=<code>`. The page renders only the fixed message for a known code. */
export const BILLING_ERROR_MESSAGES = {
  unauthorized: "Your session expired. Sign in again to continue.",
  rate_limited: "Too many checkout attempts. Wait a minute and try again.",
  invalid_plan: "That plan isn't available for checkout. Pick a plan from the list.",
  invalid_amount: "That credit pack isn't available. Pick a pack from the list.",
  not_configured: "Payments aren't available right now. Try again later or contact support.",
  checkout_failed: "We couldn't start checkout. You weren't charged. Try again.",
} as const;

export type BillingErrorCode = keyof typeof BILLING_ERROR_MESSAGES;

export function isBillingErrorCode(value: unknown): value is BillingErrorCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BILLING_ERROR_MESSAGES, value);
}

/** Message for a query-string value, or null when it is missing or not a known code. */
export function billingErrorMessage(value: string | null | undefined): string | null {
  return isBillingErrorCode(value) ? BILLING_ERROR_MESSAGES[value] : null;
}
