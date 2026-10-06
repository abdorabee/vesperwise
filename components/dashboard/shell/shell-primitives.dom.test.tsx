// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppFrame } from "./app-frame";
import { ShellListProvider, ShellList, ShellListSlot, useShellListFrame } from "./shell-list";
import { ShellPanel, ShellPanelProvider, ShellPanelSlot, useShellPanelFrame } from "./shell-panel";
import { ShellStatusProvider, useShellStatus, useShellStatusValue } from "./shell-status";

// These tests mount the shell primitives for real, so effects and ref callbacks run.
// They exist because server-rendered tests missed "Maximum update depth exceeded" loops.

let consoleError: ReturnType<typeof vi.spyOn>;

// An effect loop can spin forever instead of hitting React's depth limit, which would
// hang the run. RenderBudget subscribes to every shell context and throws during render
// once they re-render implausibly often; a render-phase throw stops the loop and fails the test.
const RENDER_BUDGET = 200;
const renderCount = { value: 0 };

function RenderBudget() {
  useShellPanelFrame();
  useShellListFrame();
  useShellStatusValue();
  // Counting renders is this test helper's job; it never runs in app code.
  // eslint-disable-next-line react-hooks/immutability
  renderCount.value += 1;
  if (renderCount.value > RENDER_BUDGET) {
    throw new Error(`Render loop: shell contexts re-rendered more than ${RENDER_BUDGET} times`);
  }
  return null;
}

beforeEach(() => {
  renderCount.value = 0;
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

function expectNoUpdateLoop() {
  const loopErrors = consoleError.mock.calls.filter((args) => String(args[0]).includes("Maximum update depth"));
  expect(loopErrors).toEqual([]);
}

function frameStyle(name: string) {
  return document.querySelector<HTMLElement>('[data-slot="app-frame"]')?.style.getPropertyValue(name);
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <ShellStatusProvider>
      <ShellPanelProvider>
        <ShellListProvider>
          <RenderBudget />
          <AppFrame rail={<nav>Rail</nav>} list={<ShellListSlot />} panel={<ShellPanelSlot />}>
            {children}
          </AppFrame>
        </ShellListProvider>
      </ShellPanelProvider>
    </ShellStatusProvider>
  );
}

/** A page that re-renders often and passes a fresh inline onClose each time. */
function PanelPage() {
  const [open, setOpen] = useState(true);
  const [renders, setRenders] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRenders((count) => count + 1)}>Rerender {renders}</button>
      <ShellPanel open={open} size="wide" label="Account details" onClose={() => setOpen(false)}>
        <p>Panel body</p>
      </ShellPanel>
    </>
  );
}

describe("ShellPanel (mounted)", () => {
  it("portals into the frame's panel slot and widens the frame without looping", () => {
    render(<Frame><PanelPage /></Frame>);

    const slot = document.querySelector('[data-slot="app-frame-panel"]');
    expect(slot?.textContent).toContain("Panel body");
    expect(frameStyle("--app-frame-panel-w")).toBe("var(--panel-w-wide)");

    for (let index = 0; index < 5; index += 1) fireEvent.click(screen.getByRole("button", { name: /Rerender/ }));
    expect(slot?.textContent).toContain("Panel body");
    expectNoUpdateLoop();
  });

  it("closes on Escape through the page's latest onClose", () => {
    render(<Frame><PanelPage /></Frame>);
    fireEvent.click(screen.getByRole("button", { name: /Rerender/ }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(screen.queryByText("Panel body")).toBeNull();
    expect(frameStyle("--app-frame-panel-w")).toBe("0px");
    expectNoUpdateLoop();
  });
});

function ListPage({ title }: { title: string }) {
  return (
    <ShellList label="Accounts" title={title}>
      <p>List body</p>
    </ShellList>
  );
}

describe("ShellList (mounted)", () => {
  it("portals into the list slot, opens the column, and closes it on unmount", () => {
    const { rerender } = render(<Frame><ListPage title="Watchlist" /></Frame>);

    expect(document.querySelector('[data-slot="app-frame-list"]')?.textContent).toContain("List body");
    expect(frameStyle("--app-frame-list-w")).toBe("var(--list-w)");

    rerender(<Frame><ListPage title="Watchlist (2)" /></Frame>);
    expect(screen.getByText("Watchlist (2)")).toBeTruthy();

    rerender(<Frame><p>No column</p></Frame>);
    expect(frameStyle("--app-frame-list-w")).toBe("0px");
    expectNoUpdateLoop();
  });
});

function StatusPoster({ done }: { done: number }) {
  // A new object every render, like real callers build.
  useShellStatus({ text: `Scoring ramp.com · ${done}/4 signals`, busy: true });
  return null;
}

function StatusReader() {
  return <output>{useShellStatusValue()?.text ?? "idle"}</output>;
}

describe("useShellStatus (mounted)", () => {
  it("shows the latest message, survives re-renders, and clears on unmount", () => {
    const tree = (done: number | null) => (
      <ShellStatusProvider>
        {done === null ? null : <StatusPoster done={done} />}
        <StatusReader />
      </ShellStatusProvider>
    );
    const { rerender } = render(tree(1));
    expect(screen.getByRole("status").textContent).toBe("Scoring ramp.com · 1/4 signals");

    rerender(tree(3));
    expect(screen.getByRole("status").textContent).toBe("Scoring ramp.com · 3/4 signals");

    rerender(tree(null));
    expect(screen.getByRole("status").textContent).toBe("idle");
    expectNoUpdateLoop();
  });
});
