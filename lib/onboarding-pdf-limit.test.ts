import { describe, expect, it } from "vitest";

import {
  consumePdfRead,
  createMemoryPdfReadLedger,
  PDF_READ_LIMIT,
  PDF_READ_WINDOW_MS,
} from "./onboarding-pdf-limit";

describe("consumePdfRead", () => {
  it("allows a bounded number of reads per user, then asks them to wait", async () => {
    const ledger = createMemoryPdfReadLedger();
    const now = 1_700_000_000_000;
    for (let i = 0; i < PDF_READ_LIMIT; i++) {
      await expect(consumePdfRead("user_a", now + i, ledger)).resolves.toEqual({ ok: true });
    }
    const blocked = await consumePdfRead("user_a", now + PDF_READ_LIMIT, ledger);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    await expect(consumePdfRead("user_b", now, ledger)).resolves.toEqual({ ok: true });
  });

  it("opens the window again after it expires", async () => {
    const ledger = createMemoryPdfReadLedger();
    const now = 1_700_000_000_000;
    for (let i = 0; i < PDF_READ_LIMIT; i++) {
      await consumePdfRead("user_a", now, ledger);
    }
    await expect(consumePdfRead("user_a", now + PDF_READ_WINDOW_MS, ledger)).resolves.toEqual({ ok: true });
  });
});
