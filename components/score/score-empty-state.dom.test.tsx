// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ScoreEmptyState } from "./score-empty-state";

beforeAll(() => {
  window.matchMedia = window.matchMedia ?? ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList);
});

afterEach(cleanup);

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const row = (domain: string, score: number | null, days: number) => ({ domain, company_name: domain, score, score_band: "WARM" as const, created_at: daysAgo(days) });

function mount(rows: ReturnType<typeof row>[], onRescore = vi.fn()) {
  render(<ScoreEmptyState onSubmit={vi.fn()} onOpenRecent={vi.fn()} onRescore={onRescore} recentScores={rows} creditsRemaining={5} busy={false} />);
  return onRescore;
}

describe("ScoreEmptyState recents", () => {
  it("shows one row per domain, newest kept", () => {
    mount([row("stripe.com", 80, 10), row("stripe.com", 60, 2), row("ramp.com", 50, 1)]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("60")).toBeTruthy();
    expect(screen.queryByText("80")).toBeNull();
  });

  it("flags scores older than 30 days as stale", () => {
    mount([row("old.com", 70, 45), row("fresh.com", 70, 3)]);
    expect(screen.getAllByText("Stale")).toHaveLength(1);
  });

  it("explains a zero score", () => {
    mount([row("quiet.com", 0, 2)]);
    expect(screen.getByText("No recent signals")).toBeTruthy();
  });

  it("rescore shows the cost and delegates to the confirm path without opening the result", () => {
    const onRescore = mount([row("stripe.com", 80, 2)]);
    const button = screen.getByRole("button", { name: "Rescore stripe.com · 1 credit" });
    expect(button.textContent).toContain("1 credit");
    fireEvent.click(button);
    expect(onRescore).toHaveBeenCalledWith("stripe.com");
  });

  it("pre-fills the composer from a link without scoring", () => {
    const onSubmit = vi.fn();
    render(<ScoreEmptyState onSubmit={onSubmit} prefill="stripe.com" creditsRemaining={5} busy={false} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("stripe.com");
    expect(screen.getByRole("button", { name: "Score stripe.com · 1 credit" })).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
