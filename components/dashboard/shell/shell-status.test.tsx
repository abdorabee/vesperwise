import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ShellStatusProvider } from "./shell-status";
import { StatusBar } from "./status-bar";

vi.mock("@/components/dashboard/search-provider", () => ({
  useDashboardSearch: () => ({ open: vi.fn() }),
}));

describe("shell status slot", () => {
  it("shows a page-owned status message before global status items", () => {
    const html = renderToStaticMarkup(
      <ShellStatusProvider initialMessage={{ text: "Scoring ramp.com · 3/5 signals", busy: true }}>
        <StatusBar creditsRemaining={8} plan="growth" />
      </ShellStatusProvider>,
    );

    expect(html).toContain('data-slot="statusbar-page-status"');
    expect(html).toContain("Scoring ramp.com · 3/5 signals");
    expect(html.indexOf("Scoring ramp.com")).toBeLessThan(html.indexOf("8 credits"));
  });

  it("clears the status slot when no page message is set", () => {
    const html = renderToStaticMarkup(
      <ShellStatusProvider>
        <StatusBar creditsRemaining={8} plan="growth" />
      </ShellStatusProvider>,
    );

    expect(html).not.toContain('data-slot="statusbar-page-status"');
    expect(html).toContain("8 credits");
  });
});
