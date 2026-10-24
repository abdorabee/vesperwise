/**
 * Check if credit bypass is enabled. This is ONLY for development/testing and
 * should never be true in production. The env var check ensures it can't
 * accidentally be enabled in production environments.
 */
export function isDevCreditBypassEnabled(): boolean {
  // Only allow bypass in explicit development environments
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.DISABLE_CREDIT_CHECK === "true";
}
