import { createSupabaseAdmin } from "@/lib/supabase";

// Legacy person-score cache TTL. Company scoring v2 uses the explicit,
// personalized TTL below so one workspace can never receive another's result.
export const SCORE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const SCORE_RESULT_TTL_SECONDS = 60 * 60 * 6; // 6 hours
export const SCORE_EVIDENCE_TTL_SECONDS = 60 * 60 * 6; // 6 hours

export function scoreCacheKey(domain: string): string {
  return `score:${domain.toLowerCase().trim()}`;
}

/** Workspace-neutral evidence cache. Never include seller/profile data here. */
export function scoreEvidenceCacheKey(domain: string, schemaVersion: string): string {
  return `score:evidence:${schemaVersion}:${domain.toLowerCase().trim()}`;
}

/** Personalized score cache, isolated by workspace, seller profile, and scorer. */
export function scoreResultCacheKey(
  userId: string,
  domain: string,
  profileHash: string,
  scoringVersion: string
): string {
  return [
    "score:result",
    scoringVersion,
    encodeURIComponent(userId),
    profileHash,
    domain.toLowerCase().trim(),
  ].join(":");
}

export function personScoreCacheKey(identifier: string): string {
  return `person_score:${identifier.toLowerCase().trim()}`;
}

function isCacheDisabled(): boolean {
  return process.env.CACHE_DISABLED === "true";
}

/** Get from cache. Returns null if disabled, missing, expired, or unavailable. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isCacheDisabled()) return null;

  try {
    const { data, error } = await createSupabaseAdmin()
      .from("cache_entries")
      .select("value, expires_at")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.warn("[cache] read failed", error);
      return null;
    }
    if (!data) return null;

    const expiresAt = new Date(data.expires_at).getTime();
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return null;

    return data.value as T;
  } catch (error) {
    console.warn("[cache] read failed", error);
    return null;
  }
}

/** Set in cache. No-op if disabled or unavailable. */
export async function cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
  if (isCacheDisabled()) return;

  try {
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const { error } = await createSupabaseAdmin()
      .from("cache_entries")
      .upsert(
        { key, value, expires_at: expiresAt },
        { onConflict: "key" }
      );

    if (error) console.warn("[cache] write failed", error);
  } catch (error) {
    console.warn("[cache] write failed", error);
  }
}
