/** Values a model sometimes leaves as literal `{token}` placeholders in generated copy. */
export interface PlaceholderValues {
  score?: number | null;
  company?: string | null;
  domain?: string | null;
  band?: string | null;
}

const TOKEN = /\{\s*(score|company|domain|band)\s*\}/gi;

/** Replaces `{score}`, `{company}`, `{domain}` and `{band}` with real values; unknown values are left as-is. */
export function fillPlaceholders(text: string, values: PlaceholderValues): string {
  return text.replace(TOKEN, (match, name: string) => {
    const key = name.toLowerCase() as keyof PlaceholderValues;
    const value = key === "company" ? values.company || values.domain : values[key];
    return value === null || value === undefined || value === "" ? match : String(value);
  });
}

/** Applies `fillPlaceholders` to every string (and string array) field of a flat record. */
export function fillPlaceholderFields<T extends Record<string, unknown>>(record: T, values: PlaceholderValues): T {
  const entries = Object.entries(record).map(([key, value]) => {
    if (typeof value === "string") return [key, fillPlaceholders(value, values)];
    if (Array.isArray(value)) return [key, value.map((item) => (typeof item === "string" ? fillPlaceholders(item, values) : item))];
    return [key, value];
  });
  return Object.fromEntries(entries) as T;
}
