import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      >
        <p>Route content</p>
      </DashboardShell>
    );
  }

  it("uses the application-shell geometry with a stable scrollable navigation footer", () => {
    const html = renderShell();

    expect(html).toContain('data-variant="sidebar"');
    expect(html).toContain("--sidebar-width:16rem");
    expect(html).toContain("h-16");
    expect(html).toContain('data-slot="scroll-area"');
    expect(html).toContain('data-slot="sidebar-footer"');
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

  it("uses the reference navigation hierarchy with tailored nested library sections", () => {
    const html = renderShell();

    for (const label of ["Overview", "Library", "Workspace"]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).not.toContain(">Accounts<");
    expect(html).toContain("Saved accounts");
    expect(html).toContain("Score activity");
    expect(html).toContain('data-slot="sidebar-menu-sub"');
  });

  it("shows an always-visible credits meter above the user row", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="sidebar-credits"');
    expect(html).toContain("42 of 2,500 credits remaining");
    expect(html.indexOf('data-slot="sidebar-credits"')).toBeLessThan(html.indexOf("Abdo Rabee"));
    // 42 / 2,500 is under 20%, so the meter becomes a Top up prompt on a paid plan.
    expect(html).toContain(">Top up<");
    expect(html).toContain('data-slot="sidebar-rail"');
  });

  it("shows the plan as a capitalized badge next to the brand glyph", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="plan-badge"');
    expect(html).toContain(">Growth<");
    expect(html).not.toContain("· growth");
  });

  it("renders the reference mobile brand treatment instead of a route-title substitute", () => {
    const html = renderShell();

    expect(html).toContain('data-slot="mobile-brand"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain(">VesperWise<");
    // Real brand glyph (favicon.svg path), not a lettered square.
    expect(html).toContain("M13.5 19H24l7.9 25.4L39.9 19h10.6L37.2 48H26.8L13.5 19Z");
    expect(html).not.toMatch(/>V<\/span>/);
  });
});
