// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryStats } from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/history",
}));
vi.mock("@/components/account-panel/account-panel", () => ({ AccountPanel: () => null }));
vi.mock("@/components/account-panel/use-account-param", () => ({
  useAccountParam: () => ({ account: null, openAccount: vi.fn(), closeAccount: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { HistoryView } from "./history-view";

const STATS: HistoryStats = {
  totalCount: 0,
  monthlyCount: 0,
  creditsUsed30d: 0,
  priorMonthCount: 0,
  hotCount: 0,
  warmCount: 0,
  coldCount: 0,
  avgScore: 0,
  flippedToHot: 0,
  rescoreCount: 0,
  lastScoredAt: null,
  activityData: [],
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("HistoryView load states", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an error with Retry, not the empty state, when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respond({ error: "boom" }, 500));
    render(<HistoryView stats={STATS} />);

    await screen.findByText("Couldn't load your score history");
    expect(screen.queryByText("No scores yet")).toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce(respond({ scores: [], total: 0, totalPages: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No scores yet");
    expect(screen.queryByText("Couldn't load your score history")).toBeNull();
  });

  it("shows the empty state with a Score a company CTA only after a successful empty response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respond({ scores: [], total: 0, totalPages: 1 }));
    render(<HistoryView stats={STATS} />);

    await waitFor(() => expect(screen.getByText("No scores yet")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Score a company" }).getAttribute("href")).toBe("/score");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("labels the band chips with their 30-day window and the HOT stat with what it counts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(respond({ scores: [], total: 0, totalPages: 1 }));
    render(<HistoryView stats={STATS} />);
    await screen.findByText("No scores yet");
    expect(screen.getByText("Last 30 days")).toBeTruthy();
    expect(screen.getByText("HOT scores, last 7 days")).toBeTruthy();
    expect(screen.queryByText("Bands flipped to HOT")).toBeNull();
    expect(screen.getByText("HOT (≥75)")).toBeTruthy();
  });
});
