/** URL query param that holds the account (domain) open in the shared account panel. */
export const ACCOUNT_PARAM = "account";

/**
 * Builds the href for `pathname` with the account param set to `domain`, or removed
 * when `domain` is null. Other query params are preserved.
 */
export function accountHref(pathname: string, search: string, domain: string | null): string {
  const params = new URLSearchParams(search);
  if (domain) params.set(ACCOUNT_PARAM, domain);
  else params.delete(ACCOUNT_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Reads a usable domain from the account param, or null. */
export function readAccountParam(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}
