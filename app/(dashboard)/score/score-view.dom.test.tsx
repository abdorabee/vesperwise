// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreView } from "./score-view";

let query = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/components/tour/score-tour", () => ({ ScoreTour: () => null }));
vi.mock("@/components/score/score-thread-list", () => ({ ScoreThreadList: () => null }));

const fetchMock = vi.fn();

beforeAll(() => {
  window.matchMedia = window.matchMedia ?? ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList);
});

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(search: string) {
  query = search;
  render(<ScoreView creditsRemaining={5} recentScores={[]} onboardingComplete />);
}

const scoreCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/v1/score"));

describe("ScoreView deep links", () => {
  it("pre-fills ?domain= and waits for confirmation instead of spending a credit", async () => {
    mount("domain=stripe.com");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("stripe.com");
    expect(screen.getByRole("button", { name: "Score stripe.com · 1 credit" })).toBeTruthy();
    await Promise.resolve();
    expect(scoreCalls()).toHaveLength(0);
  });

  it("confirming the pre-filled domain scores it", async () => {
    mount("domain=stripe.com");
    fireEvent.click(screen.getByRole("button", { name: "Score stripe.com · 1 credit" }));
    await waitFor(() => expect(scoreCalls()).toHaveLength(1));
  });

  it("opens the stored result for view=last without scoring", async () => {
    mount("domain=stripe.com&view=last");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/dashboard/scores/latest?domain=stripe.com"))).toBe(true));
    expect(scoreCalls()).toHaveLength(0);
  });

  it("shows an inline message for an invalid domain and sends nothing", () => {
    mount("domain=not%20a%20domain");
    expect(screen.getByRole("alert").textContent).toContain("isn't valid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-domain text without an active result and sends nothing", async () => {
    mount("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "tell me about stripe" } });
    fireEvent.click(screen.getByRole("button", { name: "Score company" }));
    expect(await screen.findByText("Enter a company domain like stripe.com")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
