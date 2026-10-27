export function watchlistDeleteUrl(domain: string): string {
  return `/api/dashboard/watchlist?domain=${encodeURIComponent(domain)}`;
}

/** DELETE goes out immediately. keepalive covers a reload during the request. */
export function deleteWatchlistEntry(domain: string, fetchImpl: typeof fetch = fetch): Promise<Response> {
  return fetchImpl(watchlistDeleteUrl(domain), { method: "DELETE", keepalive: true });
}

/** Undo puts the account back. Call after the DELETE settles so it cannot win the race. */
export function restoreWatchlistEntry(
  domain: string,
  companyName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl("/api/dashboard/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, company_name: companyName }),
    keepalive: true,
  });
}
