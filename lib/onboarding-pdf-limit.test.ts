import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cacheRows = vi.hoisted(() => {
  const rows = new Map<string, unknown>();

  function admin() {
    return {
      from(table: string) {
        if (table !== "cache_entries") throw new Error(`unexpected table ${table}`);
        return {
          select() {
            return {
              eq(_column: string, key: string) {
                return {
                  async maybeSingle() {
                    await Promise.resolve();
                    if (!rows.has(key)) return { data: null, error: null };
                    return { data: { value: rows.get(key) }, error: null };
                  },
                };
              },
            };
          },
          async insert(row: { key: string; value: unknown }) {
            await Promise.resolve();
            if (rows.has(row.key)) return { error: { code: "23505" } };
            rows.set(row.key, row.value);
            return { error: null };
          },
          update(patch: { value: unknown }) {
            const filters: Array<{ column: string; value: string }> = [];
            const builder = {
              eq(column: string, value: string) {
                filters.push({ column, value: String(value) });
                return builder;
              },
              async select() {
                await Promise.resolve();
                const key = filters.find((filter) => filter.column === "key")?.value;
                if (!key || !rows.has(key)) return { data: [], error: null };
                const current = rows.get(key);
                const version = filters.find((filter) => filter.column === "value->>v");
                const legacy = filters.find((filter) => filter.column === "value");
                if (version) {
                  const stored = current && typeof current === "object" && !Array.isArray(current)
                    ? String((current as { v?: unknown }).v)
                    : null;
                  if (stored !== version.value) return { data: [], error: null };
                } else if (legacy) {
                  const quoted = legacy.value;
                  const inner = quoted.startsWith('"') && quoted.endsWith('"')
                    ? quoted.slice(1, -1)
                    : null;
                  if (inner === null || JSON.stringify(current) !== inner) return { data: [], error: null };
                } else {
                  rows.set(key, patch.value);
                  return { data: [{ key }], error: null };
                }
                rows.set(key, patch.value);
                return { data: [{ key }], error: null };
              },
            };
            return builder;
          },
        };
      },
    };
  }

  return { rows, admin };
});

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => cacheRows.admin(),
}));

import {
  consumePdfRead,
  createMemoryPdfReadStore,
  createPdfReadLedger,
  PDF_READ_LIMIT,
  PDF_READ_WINDOW_MS,
  releasePdfRead,
} from "./onboarding-pdf-limit";

const CACHE_PREFIX = "onboarding:pdf-read:";

describe("consumePdfRead", () => {
  beforeEach(() => {
    cacheRows.rows.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows a bounded number of reads per user, then asks them to wait", async () => {
    const ledger = createPdfReadLedger(createMemoryPdfReadStore());
    const now = 1_700_000_000_000;
    for (let i = 0; i < PDF_READ_LIMIT; i++) {
      await expect(consumePdfRead("user_a", now + i, ledger)).resolves.toMatchObject({ ok: true });
    }
    const blocked = await consumePdfRead("user_a", now + PDF_READ_LIMIT, ledger);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    await expect(consumePdfRead("user_b", now, ledger)).resolves.toMatchObject({ ok: true });
  });

  it("opens the window again after it expires", async () => {
    const ledger = createPdfReadLedger(createMemoryPdfReadStore());
    const now = 1_700_000_000_000;
    for (let i = 0; i < PDF_READ_LIMIT; i++) {
      await consumePdfRead("user_a", now, ledger);
    }
    await expect(consumePdfRead("user_a", now + PDF_READ_WINDOW_MS, ledger)).resolves.toMatchObject({ ok: true });
  });

  it("does not let concurrent consumes exceed the hourly cap", async () => {
    const now = 1_700_000_000_000;
    const burst = PDF_READ_LIMIT + 12;

    for (let round = 0; round < 5; round++) {
      const store = createMemoryPdfReadStore();
      const ledgers = [createPdfReadLedger(store), createPdfReadLedger(store)];
      const results = await Promise.all(
        ledgers.flatMap((ledger) =>
          Array.from({ length: burst }, () => consumePdfRead(`user_${round}`, now, ledger))
        )
      );

      expect(results.filter((result) => result.ok)).toHaveLength(PDF_READ_LIMIT);
      for (const result of results) {
        if (!result.ok) expect(result.retryAfterSeconds).toBeGreaterThan(0);
      }
      await expect(consumePdfRead(`user_${round}`, now, ledgers[0])).resolves.toMatchObject({ ok: false });
    }
  });

  it("keeps the shared cache cap atomic when parallel reads race", async () => {
    vi.stubEnv("CACHE_DISABLED", "false");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const now = 1_700_000_000_000;
      const burst = PDF_READ_LIMIT + 12;
      const results = await Promise.all(
        Array.from({ length: burst }, () => consumePdfRead("user_cache", now))
      );

      expect(results.filter((result) => result.ok)).toHaveLength(PDF_READ_LIMIT);
      await expect(consumePdfRead("user_cache", now)).resolves.toMatchObject({ ok: false });

      const stored = cacheRows.rows.get(`${CACHE_PREFIX}user_cache`) as { v: number; stamps: number[] };
      expect(stored.stamps).toHaveLength(PDF_READ_LIMIT);
      expect(stored.v).toBe(PDF_READ_LIMIT);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("still caps one process when the shared cache is disabled", async () => {
    vi.stubEnv("CACHE_DISABLED", "true");
    const now = 1_700_000_000_000;
    const burst = PDF_READ_LIMIT + 4;
    const results = await Promise.all(
      Array.from({ length: burst }, () => consumePdfRead("user_local", now))
    );

    expect(results.filter((result) => result.ok)).toHaveLength(PDF_READ_LIMIT);
    expect(cacheRows.rows.size).toBe(0);
  });

  it("upgrades a legacy stamp list without letting a full window through", async () => {
    vi.stubEnv("CACHE_DISABLED", "false");
    const now = 1_700_000_000_000;
    const openKey = `${CACHE_PREFIX}user_legacy`;
    const legacy = [now - 3_000, now - 2_000, now - 1_000];
    cacheRows.rows.set(openKey, legacy);

    await expect(consumePdfRead("user_legacy", now)).resolves.toMatchObject({ ok: true });
    const stored = cacheRows.rows.get(openKey) as { v: number; stamps: number[] };
    expect(stored).toEqual({ v: 1, stamps: [...legacy, now] });

    const fullKey = `${CACHE_PREFIX}user_full`;
    const full = Array.from({ length: PDF_READ_LIMIT }, (_, index) => now + index);
    cacheRows.rows.set(fullKey, full);
    await expect(consumePdfRead("user_full", now + PDF_READ_LIMIT)).resolves.toMatchObject({ ok: false });
    expect(cacheRows.rows.get(fullKey)).toBe(full);
  });

  it("returns one reserved read to the allowance without letting a burst past the cap", async () => {
    const ledger = createPdfReadLedger(createMemoryPdfReadStore());
    const now = 1_700_000_000_000;
    const stamps: number[] = [];
    for (let i = 0; i < PDF_READ_LIMIT; i++) {
      const decision = await consumePdfRead("user_release", now + i, ledger);
      expect(decision.ok).toBe(true);
      if (decision.ok) stamps.push(decision.stamp);
    }
    await expect(consumePdfRead("user_release", now + PDF_READ_LIMIT, ledger)).resolves.toMatchObject({ ok: false });

    await releasePdfRead("user_release", stamps[0], now + PDF_READ_LIMIT, ledger);
    await releasePdfRead("user_release", now - 1, now + PDF_READ_LIMIT, ledger);
    const again = await consumePdfRead("user_release", now + PDF_READ_LIMIT, ledger);
    expect(again.ok).toBe(true);
    await expect(consumePdfRead("user_release", now + PDF_READ_LIMIT + 1, ledger)).resolves.toMatchObject({
      ok: false,
    });
  });

  it("drops one cached stamp when a server failure releases the read", async () => {
    vi.stubEnv("CACHE_DISABLED", "false");
    const now = 1_700_000_000_000;
    const reserved = await consumePdfRead("user_cache_release", now);
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    await releasePdfRead("user_cache_release", reserved.stamp, now);

    const stored = cacheRows.rows.get(`${CACHE_PREFIX}user_cache_release`) as { v: number; stamps: number[] };
    expect(stored.stamps).toEqual([]);
    await expect(consumePdfRead("user_cache_release", now + 1)).resolves.toMatchObject({ ok: true });
  });
});
