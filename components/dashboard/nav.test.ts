import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const navSource = readFileSync(new URL("./nav.tsx", import.meta.url), "utf8");
const navConfigSource = readFileSync(new URL("./nav-config.ts", import.meta.url), "utf8");
const shellSource = readFileSync(
  new URL("./dashboard-shell.tsx", import.meta.url),
  "utf8"
);
const dashboardLayoutSource = readFileSync(
  new URL("../../app/(dashboard)/layout.tsx", import.meta.url),
  "utf8"
);
const settingsSource = readFileSync(
  new URL("../../app/(dashboard)/settings/page.tsx", import.meta.url),
  "utf8"
);

describe("dashboard profile navigation cleanup", () => {
  it("omits the retired Memory page from the shared dashboard navigation", () => {
    expect(navConfigSource).not.toMatch(/href:\s*["']\/memory["']/);
    expect(navConfigSource).not.toMatch(/label:\s*["']Profile["']/);
  });

  it("uses application-shell1 chrome for authenticated dashboard routes", () => {
    expect(shellSource).toContain("ApplicationShell1");
    expect(shellSource).toContain("SearchProvider");
    expect(shellSource).not.toContain("AppSidebar");
    expect(shellSource).not.toContain("SiteHeader");
  });

  it("deletes the Memory page rather than leaving it reachable", () => {
    expect(
      existsSync(new URL("../../app/(dashboard)/memory/page.tsx", import.meta.url))
    ).toBe(false);
  });

  it("routes Settings to its own section with real sub-routes", () => {
    for (const path of [
      "../../app/(dashboard)/settings/layout.tsx",
      "../../app/(dashboard)/settings/profile/page.tsx",
      "../../app/(dashboard)/settings/account/page.tsx",
    ]) {
      expect(existsSync(new URL(path, import.meta.url))).toBe(true);
    }

    expect(settingsSource).not.toContain('redirect("/memory")');
    expect(settingsSource).toContain('redirect("/settings/profile")');

    expect(navConfigSource).toMatch(/href:\s*["']\/settings["']/);
    expect(navConfigSource).toMatch(/href:\s*["']\/billing["']/);
    expect(navSource).toContain("WORKSPACE_ITEMS");
  });

  it("keeps standalone onboarding reachable", () => {
    expect(existsSync(new URL("../../app/onboarding/page.tsx", import.meta.url))).toBe(true);
  });

  it("feeds the sidebar the stored workspace name from the server", () => {
    expect(dashboardLayoutSource).toContain("workspace_name");
    expect(dashboardLayoutSource).toContain("storedWorkspaceName");
    expect(shellSource).toContain("workspaceName");
    expect(shellSource).toContain("getWorkspaceLabel");
  });
});
