type CreditBypassEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Zero-credit testing stays explicit and cannot turn on in production.
 * `DISABLE_CREDIT_CHECK` is the legacy switch still set on Vercel; it follows
 * the same production guard as `DEV_BYPASS_CREDITS`.
 */
export function isDevCreditBypassEnabled(
  env: CreditBypassEnvironment = process.env,
): boolean {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") return false;
  return env.DEV_BYPASS_CREDITS === "true" || env.DISABLE_CREDIT_CHECK === "true";
}
