/**
 * Which requests the Clerk middleware must protect.
 *
 * Pages: only the app's private sections are protected, so any other path (including unknown
 * ones) reaches Next and signed-out visitors get the real 404 instead of a sign-in redirect.
 * Every section under `app/(dashboard)` must be listed here — `route-access.test.ts` enforces it.
 * API routes stay deny-by-default: anything not explicitly public requires auth.
 */

const PRIVATE_PAGE_SECTIONS = [
  "analyze",
  "api-keys",
  "autopilot",
  "billing",
  "bulk",
  "dashboard",
  "history",
  "inbox",
  "lists",
  "people",
  "pipeline",
  "score",
  "settings",
  "watchlist",
] as const;

/** Readable without auth in preview deployments only. */
const PREVIEW_ONLY_PAGE_SECTIONS = ["onboarding", "dev"] as const;

const PUBLIC_API_PATTERNS = [/^\/api\/v1(\/|$)/, /^\/api\/chat/, /^\/api\/billing\/webhook$/, /^\/api\/contact$/];

function inSection(pathname: string, sections: readonly string[]) {
  const first = pathname.split("/")[1] ?? "";
  return sections.includes(first);
}

/** Decode and lowercase so encoded or mixed-case paths can't slip past the section check. */
function normalize(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Malformed escape — match on the raw path.
  }
  return path.toLowerCase().replace(/\/{2,}/g, "/");
}

/** API and tRPC paths, which answer signed-out callers with JSON instead of a redirect. */
export function isApiPath(rawPathname: string): boolean {
  const pathname = normalize(rawPathname);
  return pathname === "/api" || pathname.startsWith("/api/") || pathname.startsWith("/trpc");
}

export function requiresAuth(rawPathname: string, { production }: { production: boolean }): boolean {
  const pathname = normalize(rawPathname);
  if (isApiPath(pathname)) {
    return !PUBLIC_API_PATTERNS.some((re) => re.test(pathname));
  }
  if (inSection(pathname, PRIVATE_PAGE_SECTIONS)) return true;
  return production && inSection(pathname, PREVIEW_ONLY_PAGE_SECTIONS);
}

export const PRIVATE_PAGE_SECTIONS_FOR_TEST = PRIVATE_PAGE_SECTIONS;
