// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppFrame } from "@/components/dashboard/shell/app-frame";
import { ShellPanelProvider, ShellPanelSlot, useShellPanelFrame } from "@/components/dashboard/shell/shell-panel";
import { AccountPanel } from "./account-panel";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const RENDER_BUDGET = 200;
const renderCount = { value: 0 };

function RenderBudget() {
  useShellPanelFrame();
  // Counting renders is this test helper's job; it never runs in app code.
  // eslint-disable-next-line react-hooks/immutability
  renderCount.value += 1;
  if (renderCount.value > RENDER_BUDGET) throw new Error(`Render loop: panel context re-rendered more than ${RENDER_BUDGET} times`);
  return null;
}

function mount(ui: React.ReactNode) {
  return render(
    <ShellPanelProvider>
      <RenderBudget />
      <AppFrame rail={<nav>Rail</nav>} panel={<ShellPanelSlot />}>{ui}</AppFrame>
    </ShellPanelProvider>,
  );
}

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

const storedScore = {
  company: "Stripe",
  domain: "stripe.com",
  intent_score: 64,
  score_band: "WARM",
  ai_summary: "Stripe is expanding its finance team.",
  created_at: "2026-09-30T10:00:00Z",
};

beforeEach(() => {
  renderCount.value = 0;
  push.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AccountPanel (mounted)", () => {
  it("loads the latest stored report and puts the page's extra tab first", async () => {
    const fetchMock = respond(200, { score: storedScore });
    vi.stubGlobal("fetch", fetchMock);

    mount(
      <AccountPanel
        domain="stripe.com"
        onClose={() => {}}
        extraTab={{ value: "pipeline", label: "Pipeline", content: <p>Stage controls</p> }}
      />,
    );

    expect(screen.getByLabelText("Loading stripe.com")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole("tab").map((tab) => tab.textContent)[0]).toBe("Pipeline"));
    expect(screen.getByText("Stage controls")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/scores/latest?domain=stripe.com", expect.anything());
  });

  it("selects the page's tab when it arrives after the report (deep link)", async () => {
    vi.stubGlobal("fetch", respond(200, { score: storedScore }));
    const extra = { value: "pipeline", label: "Pipeline", content: <p>Stage controls</p> };

    const view = mount(<AccountPanel domain="stripe.com" onClose={() => {}} />);
    // The sample score only fills Overview, so the report renders without a tab bar.
    await waitFor(() => expect(screen.getAllByText(/Stripe is expanding its finance team/).length).toBeGreaterThan(0));
    expect(screen.queryByRole("tab", { name: "Pipeline" })).toBeNull();

    view.rerender(
      <ShellPanelProvider>
        <RenderBudget />
        <AppFrame rail={<nav>Rail</nav>} panel={<ShellPanelSlot />}>
          <AccountPanel domain="stripe.com" onClose={() => {}} extraTab={extra} />
        </AppFrame>
      </ShellPanelProvider>,
    );

    await waitFor(() => expect(screen.getByRole("tab", { name: "Pipeline" }).getAttribute("data-state")).toBe("active"));
  });

  it("offers to score an account that has no stored score", async () => {
    vi.stubGlobal("fetch", respond(404, { error: "No stored score for this domain yet" }));

    mount(<AccountPanel domain="never-scored.com" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("No score yet for never-scored.com")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Score it · 1 credit" }).getAttribute("href")).toBe("/score?domain=never-scored.com");
  });

  it("shows the error and retries", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Failed to load score" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ score: storedScore }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    mount(<AccountPanel domain="stripe.com" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Failed to load score"));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("closes through the page's onClose", async () => {
    vi.stubGlobal("fetch", respond(404, {}));
    const onClose = vi.fn();

    mount(<AccountPanel domain="stripe.com" onClose={onClose} />);
    fireEvent.click(await screen.findByRole("button", { name: "Close account panel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
