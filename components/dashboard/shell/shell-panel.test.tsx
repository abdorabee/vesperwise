import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppFrame } from "./app-frame";
import { isShellPanelCloseKey, ShellPanelProvider, ShellPanelSlot } from "./shell-panel";

describe("ShellPanel", () => {
  it("renders a reusable portal target in the frame panel slot", () => {
    const html = renderToStaticMarkup(
      <ShellPanelProvider>
        <AppFrame rail={<nav>Rail</nav>} panel={<ShellPanelSlot />}>
          <main>Route</main>
        </AppFrame>
      </ShellPanelProvider>,
    );

    expect(html).toContain('data-slot="app-frame-panel"');
    expect(html).toContain('data-slot="shell-panel-target"');
    expect(html).toContain("--app-frame-panel-w:0px");
  });

  it("sets the frame panel width when a panel is open", () => {
    const html = renderToStaticMarkup(
      <ShellPanelProvider initialPanel={{ open: true, size: "wide", label: "Score report" }}>
        <AppFrame rail={<nav>Rail</nav>} panel={<ShellPanelSlot />}>
          <main>Route</main>
        </AppFrame>
      </ShellPanelProvider>,
    );

    expect(html).toContain('data-has-panel="true"');
    expect(html).toContain("--app-frame-panel-w:var(--panel-w-wide)");
  });

  it("recognizes Escape as the close key", () => {
    const onClose = vi.fn();
    if (isShellPanelCloseKey({ key: "Escape" })) onClose();
    if (isShellPanelCloseKey({ key: "Enter" })) onClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
