import { describe, expect, it } from "vitest";

import { isNavActive } from "./nav-config";

describe("isNavActive", () => {
  it("treats Chat as its own destination on the score page", () => {
    expect(isNavActive("/score", "/score#chat", "#chat")).toBe(true);
    expect(isNavActive("/score", "/score", "#chat")).toBe(false);
    expect(isNavActive("/score", "/score#chat", "")).toBe(false);
    expect(isNavActive("/score", "/score", "")).toBe(true);
  });

  it("keeps ordinary path matching for the rest of the nav", () => {
    expect(isNavActive("/pipeline", "/pipeline")).toBe(true);
    expect(isNavActive("/dashboard", "/score", "")).toBe(false);
    expect(isNavActive("/lists/abc", "/lists")).toBe(true);
  });
});
