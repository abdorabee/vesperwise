/**
 * Model-written brief text can echo provider names from signal details.
 * Replace them inline (keeping the sentence) so data vendors never reach the UI.
 */
const VENDOR_PATTERN = new RegExp(
  [
    "BuiltWith(?: Free API)?",
    "Explorium(?:-events)?",
    "GNews",
    "Open ?PageRank",
    "OPR",
    "Firecrawl",
    "Scrapling",
    "Apify",
    "OpenRouter",
    "PredictLeads",
    "Aviato",
    "Akta",
    "treg(?:-[a-z]+)?",
    "[A-Z]+(?:_[A-Z]+)*_API_KEY",
  ]
    .map((name) => `\\b${name}\\b(?:\\s+(?:API\\s+)?\\d{3}\\b)?`)
    .join("|"),
  "gi",
);

const NEUTRAL = "public data";

export function scrubVendorNames(text: string): string {
  if (!VENDOR_PATTERN.test(text)) return text;
  VENDOR_PATTERN.lastIndex = 0;
  return text
    .replace(VENDOR_PATTERN, NEUTRAL)
    .replace(new RegExp(`(?:${NEUTRAL}\\s*){2,}`, "gi"), `${NEUTRAL} `)
    .replace(/\s{2,}/g, " ")
    .trim();
}
