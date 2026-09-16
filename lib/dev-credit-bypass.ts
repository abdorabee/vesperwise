type CreditBypassEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Keeps zero-credit UI testing explicit and impossible to enable in production.
 */
export function isDevCreditBypassEnabled(
  env: CreditBypassEnvironment = process.env
): boolean {
  return env.NODE_ENV !== "production" && env.DEV_BYPASS_CREDITS === "true";
}
