/**
 * Public ids for provider keys. Stored rows and env vars keep the internal id;
 * only payloads that leave the server use this map.
 */
const PUBLIC_SOURCE_IDS: Record<string, string> = {
  explorium: "company",
  "treg-aviato": "company",
  "treg-predictleads": "company",
  "treg-hunter": "company",
  "explorium-events": "hiring",
  gnews: "news",
  "treg-akta": "news",
  builtwith: "technology",
  "open-page-rank": "web",
  firecrawl: "website",
  "firecrawl-change-tracking": "website",
  scrapling: "careers",
  github: "github",
};

const SOURCE_FIELDS = new Set([
  "source",
  "selected_source",
  "selectedSource",
  "fallback_source",
]);

const VISIBLE_TEXT_FIELDS = new Set(["detail", "label", "reason"]);

function scrubVisibleText(key: string, value: string): string {
  if (!VISIBLE_TEXT_FIELDS.has(key)) return value;
  if (key === "reason" && /firecrawl/i.test(value)) return "awaiting_change_baseline";
  if (/GNEWS_API_KEY/i.test(value) || /News API not configured/i.test(value)) return "News data unavailable";
  if (/BuiltWith Free API/i.test(value)) return "Technology data unavailable";
  if (/^BuiltWith \d+/.test(value)) return "Source unavailable";
  if (/OpenRouter|COPILOT_MAX_TOKENS/i.test(value)) return "The AI service is unavailable.";
  const rank = value.match(/(?:OPR:\s*|Open\s*PageRank\s+)(\d+)\s*\/\s*10/i);
  if (rank) return `Web presence ${rank[1]}/10`;
  if (/^Explorium (match|funding|events|firmographics) \d+/i.test(value)) return "Source unavailable";
  if (/^(GNews|OpenPageRank) \d+/.test(value)) return "Source unavailable";
  return value;
}

const CAREERS_BOARD_HOSTS = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
  "apply.workable.com",
]);

export function toPublicSourceId(source: string): string {
  return PUBLIC_SOURCE_IDS[source.trim().toLowerCase()] ?? source;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!isPlainObject(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string" && SOURCE_FIELDS.has(key)) next[key] = toPublicSourceId(child);
    else if (typeof child === "string") next[key] = scrubVisibleText(key, child);
    else next[key] = redactValue(child);
  }
  return next;
}

/** Copy a score payload with provider ids replaced at the response boundary. */
export function redactPublicSources<T>(value: T): T {
  return redactValue(value) as T;
}

/** Careers-board hosts are not linked from evidence rows. */
export function isCareersBoardUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return CAREERS_BOARD_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}
