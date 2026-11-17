import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_GROUPS, WORKSPACE_ITEMS } from "./nav-config";

let pathname = "/score";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Abdo Rabee",
      firstName: "Abdo",
      lastName: "Rabee",
      imageUrl: "",
      primaryEmailAddress: { emailAddress: "abdo@example.com" },
    },
  }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => children,
}));

import DashboardShell from "./dashboard-shell";

describe("DashboardShell", () => {
  beforeEach(() => {
    pathname = "/score";
  });

  function renderShell() {
    return renderToStaticMarkup(
      <DashboardShell
        creditsRemaining={42}
        plan="growth"
        workspaceName="Cairo Sales"
        watchlistCount={8}
        pipelineHotCount={2}
        isMockSignals
      >
        <p>Route content</p>
      </DashboardShell>
    );
  }

  it("uses the app-frame geometry with reserved rail, list, main, panel, and status slots", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="app-frame"');
    expect(html).toContain('data-has-list="false"');
    expect(html).toContain('data-has-panel="false"');
    expect(html).toContain('data-slot="app-frame-rail"');
    expect(html).toContain('data-slot="app-frame-main"');
    expect(html).toContain('data-slot="app-frame-statusbar"');
    expect(html).toContain("h-14");
    expect(html).not.toContain("h-16");
    expect(html).toContain('data-sidebar-state="expanded"');
  });

  it("maps Score to a full-height workspace with one outer gutter", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="page-container"');
    expect(html).toContain('data-size="workspace"');
    expect(html.match(/data-slot="page-container"/g)).toHaveLength(1);
  });

  it("uses constrained form and wide collection containers by route", () => {
    pathname = "/settings/profile";
    expect(renderShell()).toContain('data-size="form"');

    pathname = "/history";
    expect(renderShell()).toContain('data-size="wide"');
  });

  it("keeps regular Score links and hides unfinished People, Inbox and Autopilot from the nav", () => {
    const html = renderShell();

    expect(html).toContain('href="/score"');
    expect(html).not.toContain("Quick Score");
    for (const href of ["/people", "/inbox", "/autopilot"]) {
      expect(html).not.toContain(`href="${href}"`);
    }
    expect(html).not.toMatch(/>Soon</);
    expect(html).not.toMatch(/Coming soon/i);
  });

  it("restores API Keys to the nav as a finished destination", () => {
    expect(renderShell()).toContain('href="/api-keys"');
  });

  it("renders the grouped sidebar with every finished nav destination once and the active route", () => {
    const html = renderShell();

    for (const group of NAV_GROUPS) {
      expect(html).toContain(`>${group.label}</div>`);
    }
    for (const item of WORKSPACE_ITEMS) {
      const anchors = html.match(/<a [^>]*>/g) ?? [];
      const links = anchors.filter((tag) => tag.includes('class="vw-sb-item"') && tag.includes(`href="${item.href}"`));
      expect(links, item.href).toHaveLength(1);
      expect(html).toContain(`class="vw-sb-item__label">${item.label}</span>`);
    }

    const scoreLink = html.match(/<a[^>]+href="\/score"[^>]*>/)?.[0] ?? "";
    expect(scoreLink).toContain('aria-current="page"');
    const current = (html.match(/<a [^>]*>/g) ?? []).filter((tag) => tag.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(html).not.toContain("/score#chat");
    expect(html).not.toContain('data-slot="icon-rail"');
  });

  it("renders counts with accessible text for hot pipeline accounts and watchlist accounts", () => {
    const html = renderShell();

    expect(html).toMatch(/class="vw-sb-count"[^>]*>\s*2\s*</);
    expect(html).toMatch(/class="vw-sb-count"[^>]*>\s*8\s*</);
    expect(html).toMatch(/data-slot="rail-badge"/);
    expect(html).toContain("2 hot accounts");
    expect(html).toContain("8 on watchlist");
  });

  it("shows credits and plan in the sidebar footer, not the status bar", () => {
    const html = renderShell();
    const sidebar = html.slice(html.indexOf('data-slot="sidebar-credits"'));
    const statusBar = html.slice(html.indexOf('data-slot="dashboard-status-bar"'));

    expect(sidebar).toContain("42");
    expect(sidebar).toContain("credits · Growth");
    expect(html).toContain('href="/billing"');
    expect(html).not.toContain("credits left");
    expect(statusBar).not.toContain("42 credits");
    expect(statusBar).not.toContain('data-slot="statusbar-credits"');
    expect(statusBar).not.toContain('data-slot="statusbar-plan"');
  });

  it("keeps the mock-signals pill and a platform-aware search hint in the status bar", () => {
    const html = renderShell();
    const statusBar = html.slice(html.indexOf('data-slot="dashboard-status-bar"'));

    expect(statusBar).toContain("Mock signals");
    // The shortcut sits in a .kbd-hint span so touch devices can hide it; "Search" always shows.
    expect(statusBar).toContain('<span class="kbd-hint">Ctrl K </span>Search');
    expect(statusBar).not.toContain("⌘K Search");
    // The sidebar search row carries the same hint.
    expect(html).toContain(">Ctrl K</kbd>");
  });

  it("keeps the Settings shortcut in the sidebar footer", () => {
    expect(renderShell()).toContain('href="/settings"');
  });

  it("renders the reference mobile brand treatment instead of a route-title substitute", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="mobile-brand"');
    expect(html).toContain('href="/dashboard"');
    // The real wordmark image, not a text or lettered-square substitute.
    expect(html).toContain('alt="VesperWise"');
    expect(html).toContain("vesperwise-logo");
    // Collapsed rail keeps the compact "VW" monogram.
    expect(html).toContain(">VW</text>");
    expect(html).not.toMatch(/>V<\/span>/);
  });
});
