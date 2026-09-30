import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ rpc }),
}));

import { enqueueJob } from "./job-queue";

describe("enqueueJob", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.stubEnv("BACKGROUND_JOBS_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("skips the database when background jobs are not enabled", async () => {
    vi.stubEnv("BACKGROUND_JOBS_ENABLED", "");

    await expect(enqueueJob("q", "key", { a: 1 })).resolves.toBe(false);

    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns true when the job was inserted", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(enqueueJob("q", "key", { a: 1 }, { maxAttempts: 5 })).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith("enqueue_background_job", {
      p_queue: "q",
      p_dedupe_key: "key",
      p_payload: { a: 1 },
      p_max_attempts: 5,
    });
  });

  it("returns false when a live duplicate already exists", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(enqueueJob("q", "key", {})).resolves.toBe(false);
  });

  it("returns false instead of throwing on database errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(enqueueJob("q", "key", {})).resolves.toBe(false);
  });
});
