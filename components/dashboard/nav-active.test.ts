import { describe, expect, it } from "vitest";

import { NAV_GROUPS, WORKSPACE_ITEMS, isNavActive } from "./nav-config";

describe("isNavActive", () => {
  it("keeps Score active with or without the #chat hash", () => {
    expect(isNavActive("/score", "/score", "#chat")).toBe(true);
    expect(isNavActive("/score", "/score", "")).toBe(true);
    expect(isNavActive("/dashboard", "/score", "#chat")).toBe(false);
  });

  it("still pins a hash href to its hash", () => {
    expect(isNavActive("/score", "/score#chat", "#chat")).toBe(true);
    expect(isNavActive("/score", "/score#chat", "")).toBe(false);
  });

  it("keeps ordinary path matching for the rest of the nav", () => {
    expect(isNavActive("/pipeline", "/pipeline")).toBe(true);
    expect(isNavActive("/dashboard", "/score", "")).toBe(false);
    expect(isNavActive("/lists/abc", "/lists")).toBe(true);
  });
});

describe("NAV_GROUPS", () => {
  it("has no Chat destination: chat is the Score composer", () => {
    expect(WORKSPACE_ITEMS.map((item) => item.label)).not.toContain("Chat");
    expect(WORKSPACE_ITEMS.some((item) => item.href.includes("#"))).toBe(false);
  });

  it("orders Overview, Library, Workspace with every item once", () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual(["Overview", "Library", "Workspace"]);
    const hrefs = WORKSPACE_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("declares counts on the items that show one", () => {
    const counted = WORKSPACE_ITEMS.filter((item) => item.count).map((item) => [item.href, item.count]);
    expect(counted).toEqual([
      ["/pipeline", "hot"],
      ["/watchlist", "watchlist"],
    ]);
  });
});
