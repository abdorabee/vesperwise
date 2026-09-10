import { describe, expect, it } from "vitest";

import { getWorkspaceLabel, storedWorkspaceName } from "./workspace-label";

describe("getWorkspaceLabel", () => {
  it("prefers the stored workspace name over the Clerk identity", () => {
    expect(
      getWorkspaceLabel({
        workspaceName: "Northwind Analytics",
        fullName: "Ada Lovelace",
        email: "ada@northwind.com",
      })
    ).toBe("Northwind Analytics");
  });

  it("falls back through full name, then email local part, then a generic label", () => {
    expect(getWorkspaceLabel({ fullName: "Ada Lovelace", email: "ada@northwind.com" })).toBe(
      "Ada Lovelace"
    );
    expect(getWorkspaceLabel({ email: "ada@northwind.com" })).toBe("ada");
    expect(getWorkspaceLabel({})).toBe("Workspace");
  });

  it("treats a whitespace-only workspace name as unset rather than rendering blank", () => {
    expect(getWorkspaceLabel({ workspaceName: "   ", fullName: "Ada Lovelace" })).toBe(
      "Ada Lovelace"
    );
  });

  it("trims the stored name", () => {
    expect(getWorkspaceLabel({ workspaceName: "  Northwind  " })).toBe("Northwind");
  });
});

describe("storedWorkspaceName", () => {
  it("prefers the users column over the legacy jsonb mirror", () => {
    expect(
      storedWorkspaceName({
        workspace_name: "From Column",
        business_profile: { workspace_name: "From Jsonb" },
      })
    ).toBe("From Column");
  });

  it("falls back to the jsonb mirror for rows written before the column existed", () => {
    expect(
      storedWorkspaceName({
        workspace_name: null,
        business_profile: { workspace_name: "From Jsonb" },
      })
    ).toBe("From Jsonb");
  });

  it("returns null when neither carries a real value", () => {
    expect(storedWorkspaceName({ workspace_name: "  ", business_profile: null })).toBeNull();
    expect(storedWorkspaceName({})).toBeNull();
    expect(storedWorkspaceName(null)).toBeNull();
    expect(storedWorkspaceName(undefined)).toBeNull();
  });
});
