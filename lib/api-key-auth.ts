import { createHash } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase";

/** SHA-256 hex digest, the form keys are stored in `api_keys.key_hash`. */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/** The raw key from an `Authorization: Bearer <key>` header, or null. */
export function bearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Resolves an API key to its owner's Clerk user id, or null when the key is
 * unknown or revoked. Records `last_used` without blocking the caller.
 */
export async function authenticateApiKey(apiKey: string): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const keyHash = hashApiKey(apiKey);
  const { data } = await supabase
    .from("api_keys")
    .select("user_id, is_active")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!data?.is_active || typeof data.user_id !== "string") return null;

  void Promise.resolve(
    supabase.from("api_keys").update({ last_used: new Date().toISOString() }).eq("key_hash", keyHash)
  ).then(({ error }) => {
    if (error) console.warn("[api-key] last_used update failed", error.message);
  }, (error: unknown) => {
    console.warn("[api-key] last_used update failed", error);
  });

  return data.user_id;
}
