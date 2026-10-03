import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_LIBRARY, NAV_MAIN, NAV_SECONDARY } from "./nav-config";

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
    expect(html).toContain("h-16");
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

  it("renders the desktop rail with every finished nav destination and the active route", () => {
    const html = renderShell();

    for (const item of [...NAV_MAIN, ...NAV_LIBRARY, ...NAV_SECONDARY]) {
      expect(html).toContain(`aria-label="${item.label}"`);
    }

    const scoreLink = html.match(/<a[^>]+aria-label="Score"[^>]*>/)?.[0] ?? "";
    expect(scoreLink).toContain('href="/score"');
    expect(scoreLink).toContain('aria-current="page"');
  });

  it("renders rail badges for hot pipeline accounts and watchlist accounts", () => {
    const html = renderShell();

    expect(html).toMatch(/data-slot="rail-badge"[^>]*>\s*2\s*</);
    expect(html).toMatch(/data-slot="rail-badge"[^>]*>\s*8\s*</);
  });

  it("shows credits, plan, low-credit prompt, mock mode, and search hint in the status bar", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="dashboard-status-bar"');
    expect(html).toContain('href="/billing"');
    expect(html).toContain("42 credits");
    expect(html).not.toContain("credits left");
    expect(html).toContain(">Growth<");
    expect(html).toContain(">Top up<");
    expect(html).toContain("Mock signals");
    expect(html).toContain("⌘K Search");
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
