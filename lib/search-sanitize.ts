export const SEARCH_QUERY_MAX_LENGTH = 100;

/**
 * PostgREST `or()` filters are comma/paren delimited and use quotes and
 * backslashes for escaping, so strip those (and LIKE wildcards) to keep user
 * search input a literal value. Dots are kept: domains contain them, and a dot
 * inside the value (after the `ilike.` operator) is not parsed as syntax.
 */
export function sanitizeSearch(value: string): string {
  return value
    .replace(/[,()%*\\"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_QUERY_MAX_LENGTH);
}
