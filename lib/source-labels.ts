/**
 * Human-readable names for signal provider ids. Provider ids (`scrapling`,
 * `explorium-events`, …) are internal and must never be shown raw in the UI.
 */
const SOURCE_LABELS: Record<string, string> = {
  explorium: "Company records",
  "explorium-events": "Hiring activity",
  scrapling: "Company careers page",
  careers: "Company careers page",
  gnews: "News coverage",
  news: "News coverage",
  builtwith: "Technology profile",
  technology: "Technology profile",
  "open-page-rank": "Web presence",
  web: "Web presence",
  github: "GitHub",
  firecrawl: "Company website",
  "firecrawl-change-tracking": "Company website changes",
  website: "Company website",
  "treg-aviato": "Funding records",
  "treg-predictleads": "Company records",
  "treg-akta": "News coverage",
  "treg-hunter": "Company records",
  company: "Company records",
  hiring: "Hiring activity",
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
