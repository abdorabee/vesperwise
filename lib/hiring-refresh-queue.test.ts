import { afterEach, describe, expect, it, vi } from "vitest";

const enqueueJob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/job-queue", () => ({ enqueueJob }));

import {
  enqueueHiringRefresh,
  hiringRefreshDeduplicationId,
} from "./hiring-refresh-queue";

describe("hiring refresh job identity", () => {
  it("uses a stable per-domain deduplication identity", () => {
    expect(hiringRefreshDeduplicationId(" Example.COM "))
      .toBe(hiringRefreshDeduplicationId("example.com"));
  });
});

describe("hiring refresh enqueue", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    enqueueJob.mockReset();
  });

  it("enqueues a Postgres-backed job with the stable dedupe key", async () => {
    enqueueJob.mockResolvedValue(true);

    await expect(enqueueHiringRefresh(" Example.COM ")).resolves.toBe(true);

    expect(enqueueJob).toHaveBeenCalledWith(
      "hiring-refresh",
      "hiring-v2-example.com",
      expect.objectContaining({
        domain: "example.com",
        schemaVersion: "hiring-v2",
        requestedAt: expect.any(String),
        shadow: true,
      }),
      { maxAttempts: 3 }
    );
  });
});
