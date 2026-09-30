import assert from "node:assert/strict";
import test from "node:test";

import { runQueueWorker } from "./pg-queue.mjs";

test("runQueueWorker claims, handles, and completes a job", async () => {
  const calls = [];
  const handled = [];
  let completed = false;
  const jobRow = {
    id: "job-1",
    payload: { domain: "example.com" },
    attempts: 2,
  };
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "claim_background_job") {
        return { data: completed ? [] : [jobRow], error: null };
      }
      if (name === "complete_background_job") {
        completed = true;
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
  };

  await runQueueWorker({
    supabase,
    queue: "test-queue",
    lockSeconds: 120,
    pollIntervalMs: 0,
    handler: async (job) => handled.push(job),
    stop: () => completed,
  });

  assert.deepEqual(handled, [{
    id: "job-1",
    data: { domain: "example.com" },
    attemptsMade: 1,
  }]);
  assert.deepEqual(calls.map((call) => call.name), [
    "claim_background_job",
    "complete_background_job",
  ]);
  assert.deepEqual(calls[0].args, {
    p_queue: "test-queue",
    p_lock_seconds: 120,
  });
});

test("runQueueWorker fails a job and calls onFailed", async () => {
  const calls = [];
  const failed = [];
  let recordedFailure = false;
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "claim_background_job") {
        return {
          data: recordedFailure
            ? []
            : [{ id: "job-2", payload: { domain: "example.com" }, attempts: 1 }],
          error: null,
        };
      }
      if (name === "fail_background_job") {
        recordedFailure = true;
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
  };

  await runQueueWorker({
    supabase,
    queue: "test-queue",
    lockSeconds: 120,
    pollIntervalMs: 0,
    backoffSeconds: 45,
    handler: async () => {
      throw new Error("boom");
    },
    onFailed: async (job, error) => failed.push({ job, message: error.message }),
    stop: () => recordedFailure,
  });

  assert.deepEqual(calls.map((call) => call.name), [
    "claim_background_job",
    "fail_background_job",
  ]);
  assert.deepEqual(calls[1].args, {
    p_id: "job-2",
    p_error: "boom",
    p_backoff_seconds: 45,
  });
  assert.deepEqual(failed, [{
    job: {
      id: "job-2",
      data: { domain: "example.com" },
      attemptsMade: 0,
    },
    message: "boom",
  }]);
});

test("runQueueWorker sleeps and polls again when no job is available", async () => {
  const calls = [];
  let claims = 0;
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      claims += 1;
      return { data: [], error: null };
    },
  };

  await runQueueWorker({
    supabase,
    queue: "test-queue",
    lockSeconds: 120,
    pollIntervalMs: 0,
    handler: async () => {
      throw new Error("handler should not run");
    },
    stop: () => claims >= 1,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "claim_background_job");
});

test("runQueueWorker survives a transient claim failure", async () => {
  let claims = 0;
  const handled = [];
  const originalError = console.error;
  console.error = () => {};
  const supabase = {
    async rpc(name) {
      if (name !== "claim_background_job") return { data: null, error: null };
      claims += 1;
      if (claims === 1) return { data: null, error: { message: "network down" } };
      if (claims === 2) return { data: [{ id: "job-2", payload: {}, attempts: 1 }], error: null };
      return { data: [], error: null };
    },
  };

  try {
    await runQueueWorker({
      supabase,
      queue: "test-queue",
      lockSeconds: 60,
      pollIntervalMs: 0,
      handler: async (job) => handled.push(job.id),
      stop: () => claims >= 3,
    });
  } finally {
    console.error = originalError;
  }

  assert.deepEqual(handled, ["job-2"]);
});
