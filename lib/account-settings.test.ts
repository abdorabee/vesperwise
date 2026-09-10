import { describe, expect, it } from "vitest";

import {
  accountUpdateColumns,
  accountUpdateSchema,
  userRoleSchema,
  workspaceNameSchema,
  WORKSPACE_NAME_MAX,
} from "./account-settings";
import { USER_ROLE_OPTIONS } from "./types";

describe("userRoleSchema", () => {
  it("accepts exactly the roles the users.role CHECK constraint allows", () => {
    // Mirrors supabase/migrations/20260317000000_chat_and_pipeline.sql.
    expect([...USER_ROLE_OPTIONS]).toEqual(["sdr", "ae", "manager", "admin"]);
    for (const role of USER_ROLE_OPTIONS) {
      expect(userRoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it("rejects anything else, including a differently cased match", () => {
    for (const bad of ["owner", "", "SDR", "founder"]) {
      expect(userRoleSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("workspaceNameSchema", () => {
  it("trims and requires a real value", () => {
    expect(workspaceNameSchema.parse("  Northwind Analytics  ")).toBe("Northwind Analytics");
    expect(workspaceNameSchema.safeParse("   ").success).toBe(false);
    expect(workspaceNameSchema.safeParse("").success).toBe(false);
  });

  it("bounds the length at the same limit as the stored profile field", () => {
    expect(workspaceNameSchema.safeParse("x".repeat(WORKSPACE_NAME_MAX)).success).toBe(true);
    expect(workspaceNameSchema.safeParse("x".repeat(WORKSPACE_NAME_MAX + 1)).success).toBe(false);
  });
});

describe("accountUpdateSchema", () => {
  it("accepts either field alone, or both", () => {
    expect(accountUpdateSchema.safeParse({ workspace_name: "Northwind" }).success).toBe(true);
    expect(accountUpdateSchema.safeParse({ role: "ae" }).success).toBe(true);
    expect(
      accountUpdateSchema.safeParse({ workspace_name: "Northwind", role: "admin" }).success
    ).toBe(true);
  });

  it("rejects an empty update", () => {
    expect(accountUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("accountUpdateColumns", () => {
  it("omits keys that were not sent, so a role-only save cannot blank the name", () => {
    expect(accountUpdateColumns({ role: "manager" })).toEqual({ role: "manager" });
    expect(accountUpdateColumns({ workspace_name: "Northwind" })).toEqual({
      workspace_name: "Northwind",
    });
  });

  it("passes both through when both are sent", () => {
    expect(accountUpdateColumns({ workspace_name: "Northwind", role: "sdr" })).toEqual({
      workspace_name: "Northwind",
      role: "sdr",
    });
  });
});
