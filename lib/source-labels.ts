/**
 * Human-readable names for signal provider ids. Provider ids (`scrapling`,
 * `explorium-events`, …) are internal and must never be shown raw in the UI.
 */
const SOURCE_LABELS: Record<string, string> = {
  explorium: "Explorium business data",
  "explorium-events": "Explorium business events",
  scrapling: "Company careers page",
  gnews: "News coverage",
  builtwith: "BuiltWith",
  "open-page-rank": "Open PageRank",
  github: "GitHub",
  firecrawl: "Company website",
  "firecrawl-change-tracking": "Company website changes",
  mock: "Sample data",
};

/** Human label for a provider id. Unknown ids are title-cased rather than shown raw. */
export function sourceLabel(source: string | null | undefined): string | null {
  const id = source?.trim().toLowerCase();
  if (!id) return null;
  const known = SOURCE_LABELS[id];
  if (known) return known;
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isMockSource(source: string | null | undefined): boolean {
  return source?.trim().toLowerCase() === "mock";
}

/** Strips the " — MOCK" marker that sample signals carry in their detail text. */
export function stripMockMarker(detail: string): string {
  return detail.replace(/\s*[—–-]+\s*MOCK\s*$/i, "").trim();
}
