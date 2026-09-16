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
        inboxCount={3}
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

  it("keeps regular Score and Inbox links without a Quick Score shortcut", () => {
    const html = renderShell();

    expect(html).toContain('href="/score"');
    expect(html).toContain('href="/inbox"');
    expect(html).not.toContain("Quick Score");
  });
});
