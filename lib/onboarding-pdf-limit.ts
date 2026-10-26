import { createSupabaseAdmin } from "@/lib/supabase";

/** Reads per user. Parsing is free of credits but not free of CPU. */
export const PDF_READ_LIMIT = 8;
export const PDF_READ_WINDOW_MS = 60 * 60 * 1000;

const CACHE_PREFIX = "onboarding:pdf-read:";
const PDF_READ_TTL_SECONDS = Math.ceil(PDF_READ_WINDOW_MS / 1000);
/**
 * A parallel burst loses at most one race per accepted read, then needs one
 * more load to see a full window. Extra attempts are liveness only: a full
 * window never commits.
 */
const MAX_RESERVE_ATTEMPTS = PDF_READ_LIMIT + 4;
const UNAVAILABLE_RETRY_SECONDS = 60;

export type PdfReadDecision = { ok: true } | { ok: false; retryAfterSeconds: number };

type LoadResult =
  | { status: "missing" }
  | { status: "ready"; raw: unknown; stamps: number[] }
  | { status: "unavailable" };

type CommitResult = "committed" | "conflict" | "unavailable";

type ExpectedRow = { missing: true } | { missing: false; raw: unknown };

export interface PdfReadStore {
  load(userId: string): Promise<LoadResult>;
  commit(userId: string, expected: ExpectedRow, next: number[]): Promise<CommitResult>;
}

export interface PdfReadLedger {
  tryReserve(userId: string, now: number): Promise<PdfReadDecision>;
}

type VersionToken = { version: number };
type LegacyToken = { legacy: string };

function withinWindow(stamps: number[], now: number): number[] {
  return stamps
    .filter((stamp) => Number.isFinite(stamp) && now - stamp < PDF_READ_WINDOW_MS)
    .sort((a, b) => a - b);
}

function denied(oldest: number, now: number): PdfReadDecision {
  const retryMs = PDF_READ_WINDOW_MS - (now - oldest);
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
}

function unavailable(): PdfReadDecision {
  return { ok: false, retryAfterSeconds: UNAVAILABLE_RETRY_SECONDS };
}

/**
 * Reserve one read only if the stored ledger still matches the row we checked.
 * Overlapping requests retry or lose; an uncertain write does not allow a parse.
 */
async function reservePdfRead(
  store: PdfReadStore,
  userId: string,
  now: number
): Promise<PdfReadDecision> {
  if (!Number.isFinite(now)) return unavailable();

  for (let attempt = 0; attempt < MAX_RESERVE_ATTEMPTS; attempt++) {
    const loaded = await store.load(userId);
    if (loaded.status === "unavailable") return unavailable();

    const recent = withinWindow(loaded.status === "ready" ? loaded.stamps : [], now);
    if (recent.length >= PDF_READ_LIMIT) return denied(recent[0], now);

    const committed = await store.commit(
      userId,
      loaded.status === "missing" ? { missing: true } : { missing: false, raw: loaded.raw },
      [...recent, now]
    );
    if (committed === "committed") return { ok: true };
    if (committed === "unavailable") return unavailable();
  }

  return unavailable();
}

export function createPdfReadLedger(store: PdfReadStore): PdfReadLedger {
  return {
    tryReserve(userId, now) {
      return reservePdfRead(store, userId, now);
    },
  };
}

function yieldTurn(): Promise<void> {
  return Promise.resolve();
}

/** In-memory ledger whose load and commit yield, so overlapping reserves race. */
export function createMemoryPdfReadStore(): PdfReadStore {
  const rows = new Map<string, { version: number; stamps: number[] }>();

  return {
    async load(userId) {
      await yieldTurn();
      const row = rows.get(userId);
      if (!row) return { status: "missing" };
      return { status: "ready", raw: row.version, stamps: [...row.stamps] };
    },
    async commit(userId, expected, next) {
      await yieldTurn();
      const row = rows.get(userId);
      if (expected.missing) {
        if (row) return "conflict";
        rows.set(userId, { version: 1, stamps: [...next] });
        return "committed";
      }
      if (!row || row.version !== expected.raw) return "conflict";
      rows.set(userId, { version: row.version + 1, stamps: [...next] });
      return "committed";
    },
  };
}

export function createMemoryPdfReadLedger(): PdfReadLedger {
  return createPdfReadLedger(createMemoryPdfReadStore());
}

function finiteStamps(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const stamps: number[] = [];
  for (const stamp of value) {
    if (typeof stamp !== "number" || !Number.isFinite(stamp)) return null;
    stamps.push(stamp);
  }
  return stamps;
}

function parseStored(value: unknown): { raw: VersionToken | LegacyToken; stamps: number[] } | null {
  if (Array.isArray(value)) {
    const stamps = finiteStamps(value);
    if (!stamps) return null;
    return { raw: { legacy: JSON.stringify(value) }, stamps };
  }
  if (!value || typeof value !== "object") return null;
  const record = value as { v?: unknown; stamps?: unknown };
  if (typeof record.v !== "number" || !Number.isInteger(record.v) || record.v < 1) return null;
  const stamps = finiteStamps(record.stamps);
  if (!stamps) return null;
  return { raw: { version: record.v }, stamps };
}

function isVersionToken(raw: unknown): raw is VersionToken {
  if (!raw || typeof raw !== "object") return false;
  const version = (raw as { version?: unknown }).version;
  return typeof version === "number" && Number.isInteger(version) && version >= 1;
}

function isLegacyToken(raw: unknown): raw is LegacyToken {
  if (!raw || typeof raw !== "object") return false;
  return typeof (raw as { legacy?: unknown }).legacy === "string";
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/** PostgREST treats commas in filter values as reserved unless the value is quoted. */
function quotedJson(json: string): string {
  return `"${json.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

function expiresAt(): string {
  return new Date(Date.now() + PDF_READ_TTL_SECONDS * 1000).toISOString();
}

const cachePdfReadStore: PdfReadStore = {
  async load(userId) {
    try {
      const { data, error } = await createSupabaseAdmin()
        .from("cache_entries")
        .select("value")
        .eq("key", cacheKey(userId))
        .maybeSingle();
      if (error) {
        console.warn("[onboarding-pdf] read cap load failed");
        return { status: "unavailable" };
      }
      if (!data) return { status: "missing" };
      const parsed = parseStored(data.value);
      if (!parsed) {
        console.warn("[onboarding-pdf] read cap load failed");
        return { status: "unavailable" };
      }
      return { status: "ready", raw: parsed.raw, stamps: parsed.stamps };
    } catch {
      console.warn("[onboarding-pdf] read cap load failed");
      return { status: "unavailable" };
    }
  },

  async commit(userId, expected, next) {
    try {
      const admin = createSupabaseAdmin();
      const key = cacheKey(userId);
      const expires_at = expiresAt();

      if (expected.missing) {
        const { error } = await admin.from("cache_entries").insert({
          key,
          value: { v: 1, stamps: next },
          expires_at,
        });
        if (!error) return "committed";
        if (isUniqueViolation(error)) return "conflict";
        console.warn("[onboarding-pdf] read cap insert failed");
        return "unavailable";
      }

      const token = expected.raw;
      const versioned = isVersionToken(token);
      const legacy = isLegacyToken(token);
      if (!versioned && !legacy) return "unavailable";

      const update = admin
        .from("cache_entries")
        .update({
          value: versioned ? { v: token.version + 1, stamps: next } : { v: 1, stamps: next },
          expires_at,
        })
        .eq("key", key);
      const guarded = versioned
        ? update.eq("value->>v", String(token.version))
        : update.eq("value", quotedJson(token.legacy));
      const { data, error } = await guarded.select("key");
      if (error || !Array.isArray(data)) {
        console.warn("[onboarding-pdf] read cap update failed");
        return "unavailable";
      }
      if (data.length === 1) return "committed";
      if (data.length === 0) return "conflict";
      return "unavailable";
    } catch {
      console.warn("[onboarding-pdf] read cap update failed");
      return "unavailable";
    }
  },
};

const processLocalLedger = createMemoryPdfReadLedger();

function cacheDisabled(): boolean {
  return process.env.CACHE_DISABLED === "true";
}

export const defaultPdfReadLedger: PdfReadLedger = {
  tryReserve(userId, now) {
    if (cacheDisabled()) return processLocalLedger.tryReserve(userId, now);
    return reservePdfRead(cachePdfReadStore, userId, now);
  },
};

export async function consumePdfRead(
  userId: string,
  now = Date.now(),
  ledger: PdfReadLedger = defaultPdfReadLedger
): Promise<PdfReadDecision> {
  return ledger.tryReserve(userId, now);
}
