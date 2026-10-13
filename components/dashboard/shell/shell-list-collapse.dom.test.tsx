// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppFrame } from "./app-frame";
import { ShellList, ShellListProvider, ShellListReopenButton, ShellListSlot } from "./shell-list";

beforeAll(() => {
  // SidebarProvider reads matchMedia through useIsMobile; jsdom has none.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
});

function Page() {
  return (
    <SidebarProvider>
      <ShellListProvider>
        <AppFrame rail={<nav>Rail</nav>} list={<ShellListSlot />}>
          <ShellListReopenButton />
          <ShellList label="Score threads" title="Threads">
            <button type="button">vercel.com</button>
          </ShellList>
        </AppFrame>
      </ShellListProvider>
    </SidebarProvider>
  );
}

function frame() {
  return document.querySelector<HTMLElement>('[data-slot="app-frame"]');
}

function listAside() {
  return document.querySelector<HTMLElement>('[data-slot="app-frame-list"]');
}

describe("collapsible list column", () => {
  it("collapses from the column header and reopens from the page", () => {
    render(<Page />);

    expect(frame()?.style.getPropertyValue("--app-frame-list-w")).toBe("var(--list-w)");
    expect(screen.queryByRole("button", { name: "Show Score threads" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Collapse Score threads" }));

    expect(frame()?.style.getPropertyValue("--app-frame-list-w")).toBe("0px");
    expect(frame()?.dataset.hasList).toBe("false");
    // A zero-width column must not keep its buttons in the tab order.
    expect(listAside()?.hasAttribute("inert")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Show Score threads" }));

    expect(frame()?.style.getPropertyValue("--app-frame-list-w")).toBe("var(--list-w)");
    expect(listAside()?.hasAttribute("inert")).toBe(false);
    expect(screen.queryByRole("button", { name: "Show Score threads" })).toBeNull();
  });

  it("shows no reopen button on pages without a list column", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <ShellListProvider>
          <AppFrame rail={<nav>Rail</nav>} list={<ShellListSlot />}>
            <ShellListReopenButton />
          </AppFrame>
        </ShellListProvider>
      </SidebarProvider>,
    );

    expect(screen.queryByRole("button", { name: /^Show / })).toBeNull();
    expect(listAside()?.hasAttribute("inert")).toBe(false);
  });
});
