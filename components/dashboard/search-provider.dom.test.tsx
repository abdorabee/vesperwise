// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { openDashboardSearch } from "@/lib/dashboard-search";
import { SearchProvider } from "./search-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
});

afterEach(() => {
  cleanup();
});

const isOpen = () => screen.queryByRole("dialog", { name: "Search" }) !== null;

describe("SearchProvider", () => {
  it.each([
    ["Ctrl+K", { ctrlKey: true }],
    ["Meta+K", { metaKey: true }],
  ])("toggles the palette with %s and prevents the browser default", async (_label, modifiers) => {
    render(
      <SearchProvider>
        <div />
      </SearchProvider>,
    );

    const openEvent = new KeyboardEvent("keydown", { key: "k", cancelable: true, bubbles: true, ...modifiers });
    act(() => {
      window.dispatchEvent(openEvent);
    });
    expect(openEvent.defaultPrevented).toBe(true);
    await waitFor(() => expect(isOpen()).toBe(true));

    fireEvent.keyDown(window, { key: "k", ...modifiers });
    await waitFor(() => expect(isOpen()).toBe(false));
  });

  it("opens on the search open event", async () => {
    render(
      <SearchProvider>
        <div />
      </SearchProvider>,
    );

    act(() => openDashboardSearch());

    await waitFor(() => expect(isOpen()).toBe(true));
  });

  it("does not register a global Escape handler", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(
      <SearchProvider>
        <div />
      </SearchProvider>,
    );

    const keydownHandlers = addSpy.mock.calls.filter(([type]) => type === "keydown");
    addSpy.mockRestore();
    expect(keydownHandlers).toHaveLength(1);

    const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    act(() => {
      window.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(false);
    expect(isOpen()).toBe(false);
  });
});
