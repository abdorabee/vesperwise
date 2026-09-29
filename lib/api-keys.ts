/** Every key issued by app/api/user/api-keys starts with this prefix. */
export const API_KEY_PREFIX = "vesperwise_";

export const API_KEY_LABEL_MAX = 60;

export interface ApiKeySummary {
  id: string;
  label: string;
  last_used: string | null;
  is_active: boolean;
  created_at: string;
}

/** Trim, cap and default a user-supplied key name. */
export function normalizeApiKeyLabel(label: unknown): string {
  if (typeof label !== "string") return "Default";
  const trimmed = label.replace(/\s+/g, " ").trim().slice(0, API_KEY_LABEL_MAX);
  return trimmed || "Default";
}

/**
 * curl example for the canonical scoring endpoint. The API authenticates with
 * `Authorization: Bearer <key>` (see authenticate() in app/api/v1/score/route.ts).
 */
export function scoreCurlExample(origin: string, key = `${API_KEY_PREFIX}YOUR_KEY`): string {
  return [
    `curl -X POST ${origin.replace(/\/$/, "")}/api/v1/score \\`,
    `  -H "Authorization: Bearer ${key}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{ "domain": "stripe.com" }'`,
  ].join("\n");
}
