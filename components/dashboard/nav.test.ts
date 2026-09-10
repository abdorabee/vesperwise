import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const navSource = readFileSync(new URL("./nav.tsx", import.meta.url), "utf8");
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
    expect(navSource).not.toMatch(/href:\s*["']\/memory["']/);
    expect(navSource).not.toMatch(/label:\s*["']Profile["']/);
  });

  it("uses the same navigation for expanded, collapsed, and mobile drawer modes", () => {
    expect(shellSource.match(/<DashboardNav\b/g)).toHaveLength(1);
    expect(shellSource).toContain("collapsed={effectiveCollapsed}");
    expect(shellSource).toContain('mobileOpen ? " nav-open" : ""');
    expect(shellSource).toContain("const effectiveCollapsed = isMobile ? false : collapsed");
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

    // Billing keeps its own top-level page; Settings only links to it.
    expect(navSource).toMatch(/href:\s*["']\/settings["']/);
    expect(navSource).toMatch(/href:\s*["']\/billing["']/);
  });

  it("keeps standalone onboarding reachable", () => {
    expect(existsSync(new URL("../../app/onboarding/page.tsx", import.meta.url))).toBe(true);
  });

  it("feeds the sidebar the stored workspace name from the server", () => {
    // Without this thread the sidebar silently falls back to the Clerk name and
    // the workspace name a user set is never displayed anywhere.
    expect(dashboardLayoutSource).toContain("workspace_name");
    expect(dashboardLayoutSource).toContain("storedWorkspaceName");
    expect(shellSource).toContain("workspaceName={workspaceName}");
    expect(navSource).toContain("workspaceName");
  });
});
