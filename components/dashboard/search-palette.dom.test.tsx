// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchProvider, useDashboardSearch } from "./search-provider";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const fetchMock = vi.fn();

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function Opener() {
  const { open } = useDashboardSearch();
  return (
    <button type="button" onClick={open}>
      Open search
    </button>
  );
}

function mount() {
  render(
    <SearchProvider>
      <Opener />
    </SearchProvider>,
  );
}

function openPalette() {
  const trigger = screen.getByRole("button", { name: "Open search" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

const PLACEHOLDER = /search companies/i;
const EMPTY_BODY = { companies: [], watchlist: [], lists: [] };

describe("SearchPalette", () => {
  it("opens through the provider and focuses the input", async () => {
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    expect(screen.getByRole("dialog", { name: "Search" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("filters pages as you type and opens the selected page with Enter", async () => {
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "billing" } });

    expect(await screen.findByText("Billing")).toBeTruthy();
    expect(screen.queryByText("Watchlist")).toBeNull();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/billing");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("queries the search API once after the debounce and renders company results", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        companies: [{ id: "c1", kind: "company", label: "Stripe", sublabel: "stripe.com", href: "/score?domain=stripe.com" }],
        watchlist: [],
        lists: [],
      }),
    );
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "s" } });
    fireEvent.change(input, { target: { value: "st" } });
    fireEvent.change(input, { target: { value: "str" } });

    expect(await screen.findByText("Stripe")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/dashboard/search?q=str");
    expect(screen.getByText("Companies")).toBeTruthy();
  });

  it("does not query for a single character", async () => {
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "s" } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a quiet message when the search request fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "acme" } });

    expect(await screen.findByText(/load company results/i)).toBeTruthy();
    expect(screen.getByText("Score acme")).toBeTruthy();
  });

  it("shows an empty state when nothing matches", async () => {
    fetchMock.mockResolvedValue(jsonResponse(EMPTY_BODY));
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "zzzzqq" } });

    expect(await screen.findByText(/No results for/)).toBeTruthy();
  });

  it("offers a Score action that navigates to scoring that domain", async () => {
    fetchMock.mockResolvedValue(jsonResponse(EMPTY_BODY));
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "acme.com" } });

    const action = await screen.findByText("Score acme.com");
    fireEvent.click(action);
    expect(push).toHaveBeenCalledWith("/score?domain=acme.com");
  });

  it("closes on Escape and restores focus to the previously focused element", async () => {
    mount();
    const trigger = openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("resets the query after closing", async () => {
    mount();
    openPalette();

    const input = await screen.findByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: "billing" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    openPalette();
    const reopened = (await screen.findByPlaceholderText(PLACEHOLDER)) as HTMLInputElement;
    expect(reopened.value).toBe("");
  });

  it("lists the keyboard hints in the footer", async () => {
    mount();
    openPalette();
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(screen.getByText("↑↓").tagName).toBe("KBD");
    expect(screen.getByText("↵").tagName).toBe("KBD");
    expect(screen.getByText("esc").tagName).toBe("KBD");
  });
});
