import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const navSource = readFileSync(new URL("./nav.tsx", import.meta.url), "utf8");
const navConfigSource = readFileSync(new URL("./nav-config.ts", import.meta.url), "utf8");
const shellSource = readFileSync(
  new URL("./dashboard-shell.tsx", import.meta.url),
  "utf8"
);
const appSidebarSource = readFileSync(
  new URL("./app-sidebar.tsx", import.meta.url),
  "utf8"
);
const appFrameSource = readFileSync(
  new URL("./shell/app-frame.tsx", import.meta.url),
  "utf8"
);
const iconRailSource = readFileSync(
  new URL("./shell/icon-rail.tsx", import.meta.url),
  "utf8"
);
const statusBarSource = readFileSync(
  new URL("./shell/status-bar.tsx", import.meta.url),
  "utf8"
);
const rootLayoutSource = readFileSync(
  new URL("../../app/layout.tsx", import.meta.url),
  "utf8"
);
const shellCssSource = readFileSync(new URL("../../app/shell.css", import.meta.url), "utf8");
const dashboardLayoutSource = readFileSync(
  new URL("../../app/(dashboard)/layout.tsx", import.meta.url),
  "utf8"
);
const settingsSource = readFileSync(
  new URL("../../app/(dashboard)/settings/page.tsx", import.meta.url),
  "utf8"
);
const siteHeaderSource = readFileSync(new URL("./site-header.tsx", import.meta.url), "utf8");
const searchSource = readFileSync(new URL("../../lib/dashboard-search.ts", import.meta.url), "utf8");

describe("dashboard profile navigation cleanup", () => {
  it("omits the retired Memory page from the shared dashboard navigation", () => {
    expect(navConfigSource).not.toMatch(/href:\s*["']\/memory["']/);
    expect(navConfigSource).not.toMatch(/label:\s*["']Profile["']/);
  });

  it("uses the app-frame rail on desktop while keeping the mobile AppSidebar drawer", () => {
    expect(shellSource).toContain("SidebarProvider");
    expect(shellSource).toContain("AppSidebar");
    expect(shellSource).toContain("AppFrame");
    expect(shellSource).toContain("IconRail");
    expect(shellSource).toContain("StatusBar");
    expect(shellSource).toContain("SiteHeader");
    expect(appSidebarSource).toContain('collapsible="icon"');
    expect(appFrameSource).toContain('data-slot="app-frame-list"');
    expect(appFrameSource).toContain('data-slot="app-frame-panel"');
    expect(iconRailSource).toContain('data-slot="icon-rail"');
    expect(statusBarSource).toContain('data-slot="dashboard-status-bar"');
  });

  it("loads shell.css after theme overrides and defines shell geometry tokens outside globals.css", () => {
    const themeImport = rootLayoutSource.indexOf('import "./theme-overrides.css"');
    const shellImport = rootLayoutSource.indexOf('import "./shell.css"');

    expect(themeImport).toBeGreaterThan(-1);
    expect(shellImport).toBeGreaterThan(themeImport);
    for (const token of ["--rail-w: 3rem", "--list-w: 16rem", "--panel-w: 22rem", "--statusbar-h: 28px"]) {
      expect(shellCssSource).toContain(token);
    }
  });

  it("keeps Score as a normal destination without a Quick Score shortcut row", () => {
    expect(navConfigSource).toContain('{ href: "/score", label: "Score"');
    expect(appSidebarSource).not.toContain("Quick Score");
  });

  it("hides unfinished People, Inbox and Autopilot from the sidebar and palette, with no Soon badges", () => {
    for (const href of ["/people", "/inbox", "/autopilot"]) {
      const pattern = new RegExp(`href:\\s*["']${href}["']`);
      expect(navConfigSource).not.toMatch(pattern);
      expect(searchSource).not.toMatch(pattern);
    }
    expect(navConfigSource).not.toContain("comingSoon");
    expect(appSidebarSource).not.toMatch(/>\s*Soon\s*</);
    expect(navConfigSource).toMatch(/href:\s*["']\/api-keys["']/);
    expect(searchSource).toMatch(/href:\s*["']\/api-keys["']/);
  });

  it("keeps Score workspace actions in the approved shell header", () => {
    expect(siteHeaderSource).toContain("Threads");
    expect(siteHeaderSource).toContain("credits left");
    expect(siteHeaderSource).toContain("New score");
    expect(siteHeaderSource).toContain("openScoreThreads");
    expect(siteHeaderSource).toContain("startNewScore");
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
    expect(shellSource).toContain("workspaceName={workspaceName}");
    expect(appSidebarSource).toContain("workspaceName");
  });

  it("passes the server mock-signal flag into the dashboard shell", () => {
    expect(dashboardLayoutSource).toContain('process.env.MOCK_SIGNALS === "true"');
    expect(dashboardLayoutSource).toContain("isMockSignals={isMockSignals}");
    expect(shellSource).toContain("isMockSignals");
  });
});
