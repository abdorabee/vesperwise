import { describe, expect, it } from "vitest";

import {
  profileWriteOutcome,
  userRowOutcome,
  userUpsertOutcome,
} from "./user-provisioning-result";

describe("userUpsertOutcome", () => {
  it("surfaces a swallowed upsert error", () => {
    expect(userUpsertOutcome({ error: { message: "insert rejected" } })).toEqual({
      ok: false,
      message: "insert rejected",
    });
  });

  it("treats a clean upsert as success", () => {
    expect(userUpsertOutcome({ error: null })).toEqual({ ok: true });
  });
});

describe("userRowOutcome", () => {
  it("fails when the users row is still missing", () => {
    expect(userRowOutcome(null)).toEqual({
      ok: false,
      message: "Workspace row was not created.",
    });
  });

  it("passes when the row exists", () => {
    expect(userRowOutcome({ id: "user_abc" })).toEqual({ ok: true });
  });
});

describe("profileWriteOutcome", () => {
  it("does not treat a 0-row update as success", () => {
    expect(profileWriteOutcome({ data: null, error: null })).toEqual({
      status: 404,
      error: "Workspace not found. Reload and try again.",
    });
  });

  it("returns 500 when the database errors", () => {
    expect(profileWriteOutcome({ data: null, error: { message: "boom" } })).toEqual({
      status: 500,
      error: "Failed to save profile",
    });
  });

  it("returns 200 when a row was written", () => {
    expect(profileWriteOutcome({ data: { id: "user_abc" }, error: null })).toEqual({
      status: 200,
    });
  });
});
