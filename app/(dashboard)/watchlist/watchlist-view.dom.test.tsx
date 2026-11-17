// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WatchlistEnrichedEntry, WatchlistStats } from "@/lib/watchlist-stats";

const { toastMock, refresh, push } = vi.hoisted(() => ({
  toastMock: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  refresh: vi.fn(),
  push: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/watchlist",
}));
vi.mock("@/components/account-panel/account-panel", () => ({ AccountPanel: () => null }));
vi.mock("@/components/account-panel/use-account-param", () => ({
  useAccountParam: () => ({ account: null, openAccount: vi.fn(), closeAccount: vi.fn() }),
}));
vi.mock("@/components/lists/add-to-list-menu", () => ({ AddToListMenu: () => null }));
vi.mock("@/lib/csv", () => ({ csvFilename: () => "x.csv", downloadAuthorizedCsv: vi.fn() }));

import { WatchlistView } from "./watchlist-view";

function makeEntry(domain: string, score: number | null): WatchlistEnrichedEntry {
  return {
    id: domain,
    user_id: "u1",
    domain,
    company_name: domain,
    score,
    score_band: score == null ? null : "WARM",
    last_scored: null,
    previous_score: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    sparkline: [],
    scoreHistory: [],
    signals: null,
    delta: null,
    thresholdLabel: "Not scored",
    thresholdHit: false,
    lastMoveLabel: "—",
    lastMoveColor: "gray",
    signalMix: [],
  } as unknown as WatchlistEnrichedEntry;
}

function makeStats(entries: WatchlistEnrichedEntry[]): WatchlistStats {
  return {
    entries,
    lists: [{ id: "all", name: "All", color: "", count: entries.length, domains: entries.map((e) => e.domain) }],
    stats: { total: entries.length, hotCrossedToday: 0, lastRefreshAt: null },
    alertItems: [],
  };
}

describe("WatchlistView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows one summary toast when removing several selected accounts", async () => {
    const entries = ["a.com", "b.com", "c.com"].map((d) => makeEntry(d, 60));
    render(<WatchlistView initial={makeStats(entries)} />);
    for (const name of ["Select a.com", "Select b.com", "Select c.com"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toBe("Removed 3 accounts");
    expect(toastMock.mock.calls[0][1]).toMatchObject({ action: { label: "Undo" } });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("reports partial failures in the single summary toast", async () => {
    let call = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: ++call === 2 ? 500 : 200 })));
    const entries = ["a.com", "b.com", "c.com"].map((d) => makeEntry(d, 60));
    render(<WatchlistView initial={makeStats(entries)} />);
    for (const name of ["Select a.com", "Select b.com", "Select c.com"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toBe("Removed 2 of 3 — 1 failed");
  });

  it("tells the user a duplicate add is already on the watchlist without calling the API", async () => {
    render(<WatchlistView initial={makeStats([makeEntry("stripe.com", 80)])} />);
    const input = screen.getByPlaceholderText(/Add by domain/);
    fireEvent.change(input, { target: { value: "Stripe.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("stripe.com is already on your watchlist"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("confirms a new add with a score-now action", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    render(<WatchlistView initial={makeStats([makeEntry("stripe.com", 80)])} />);
    const input = screen.getByPlaceholderText(/Add by domain/);
    fireEvent.change(input, { target: { value: "linear.app" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Added linear.app to watchlist", expect.anything()));
    expect(refresh).toHaveBeenCalled();
  });

  it("offers an upgrade action when the plan limit is hit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Watchlist limit (5) reached for your plan" }), { status: 403 })),
    );
    render(<WatchlistView initial={makeStats([makeEntry("stripe.com", 80)])} />);
    const input = screen.getByPlaceholderText(/Add by domain/);
    fireEvent.change(input, { target: { value: "linear.app" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.error.mock.calls[0][1]).toMatchObject({ action: { label: "Upgrade" } });
  });

  it("shows a Score action for unscored rows", () => {
    render(<WatchlistView initial={makeStats([makeEntry("new.com", null)])} />);
    expect(screen.getByRole("link", { name: /Score new\.com/ }).getAttribute("href")).toBe("/score?domain=new.com");
  });
});
