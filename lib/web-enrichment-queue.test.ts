import { afterEach, describe, expect, it, vi } from "vitest";

const enqueueJob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/job-queue", () => ({ enqueueJob }));

import {
  enqueueWebEnrichment,
  WEB_ENRICHMENT_SIGNAL_KEYS,
  webEnrichmentSignalsForStatuses,
  webEnrichmentDeduplicationId,
} from "./web-enrichment-queue";

describe("web enrichment queue identifiers", () => {
  it("targets web activity and avoids broad funding crawling by default", () => {
    expect(WEB_ENRICHMENT_SIGNAL_KEYS).toEqual([
      "hiring",
      "news",
      "technology",
      "web_activity",
    ]);
  });

  it("adds funding only for an explicit structured-provider fallback", () => {
    expect(webEnrichmentSignalsForStatuses({ funding: "unavailable" }, false))
      .toEqual([...WEB_ENRICHMENT_SIGNAL_KEYS]);
    expect(webEnrichmentSignalsForStatuses({ funding: "unavailable" }, true))
      .toEqual([...WEB_ENRICHMENT_SIGNAL_KEYS, "funding"]);
    expect(webEnrichmentSignalsForStatuses({ funding: "ok" }, true))
      .toEqual([...WEB_ENRICHMENT_SIGNAL_KEYS]);
  });

  it("uses a stable domain-level deduplication key", () => {
    expect(webEnrichmentDeduplicationId(" Example.COM "))
      .toBe("web-enrichment-v1-example.com");
  });
});

describe("web enrichment enqueue", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    enqueueJob.mockReset();
  });

  it("enqueues a Postgres-backed job with unique requested signals", async () => {
    enqueueJob.mockResolvedValue(true);

    await expect(enqueueWebEnrichment(" Example.COM ", ["hiring", "funding", "hiring"]))
      .resolves.toBe(true);

    expect(enqueueJob).toHaveBeenCalledWith(
      "web-enrichment",
      "web-enrichment-v1-example.com",
      expect.objectContaining({
        domain: "example.com",
        schemaVersion: "web-enrichment-v1",
        requestedAt: expect.any(String),
        signals: ["hiring", "funding"],
        shadow: true,
      }),
      { maxAttempts: 3 }
    );
  });

  it("skips enqueueing when mock signals are active", async () => {
    vi.stubEnv("MOCK_SIGNALS", "true");

    await expect(enqueueWebEnrichment("example.com")).resolves.toBe(false);

    expect(enqueueJob).not.toHaveBeenCalled();
  });
});
