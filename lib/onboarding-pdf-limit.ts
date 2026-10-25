import { cacheGet, cacheSet } from "./cache";

/** Reads per user. Parsing is free of credits but not free of CPU. */
export const PDF_READ_LIMIT = 8;
export const PDF_READ_WINDOW_MS = 60 * 60 * 1000;

const CACHE_PREFIX = "onboarding:pdf-read:";

export interface PdfReadLedger {
  read(userId: string): Promise<number[]>;
  write(userId: string, timestamps: number[]): Promise<void>;
}

export function createMemoryPdfReadLedger(): PdfReadLedger {
  const memory = new Map<string, number[]>();
  return {
    async read(userId) {
      return memory.get(userId) ?? [];
    },
    async write(userId, timestamps) {
      memory.set(userId, timestamps);
    },
  };
}

const localReads = new Map<string, number[]>();

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

function mergeStamps(left: number[], right: number[]): number[] {
  return [...new Set([...left, ...right])].filter((stamp) => Number.isFinite(stamp)).sort((a, b) => a - b);
}

/** Cross-instance window via the existing cache, with a process-local fallback. */
export const defaultPdfReadLedger: PdfReadLedger = {
  async read(userId) {
    const cached = await cacheGet<number[]>(cacheKey(userId));
    return mergeStamps(localReads.get(userId) ?? [], Array.isArray(cached) ? cached : []);
  },
  async write(userId, timestamps) {
    localReads.set(userId, timestamps);
    await cacheSet(cacheKey(userId), timestamps, Math.ceil(PDF_READ_WINDOW_MS / 1000));
  },
};

export async function consumePdfRead(
  userId: string,
  now = Date.now(),
  ledger: PdfReadLedger = defaultPdfReadLedger
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const recent = (await ledger.read(userId))
    .filter((stamp) => Number.isFinite(stamp) && now - stamp < PDF_READ_WINDOW_MS)
    .sort((a, b) => a - b);

  if (recent.length >= PDF_READ_LIMIT) {
    const retryMs = PDF_READ_WINDOW_MS - (now - recent[0]);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
  }

  recent.push(now);
  await ledger.write(userId, recent);
  return { ok: true };
}
