// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { LivingBrief } from "./living-brief";

const block: UiBlock = {
  type: "living_brief",
  company: "Acme",
  domain: "acme.com",
  intent_score: 65,
  score_band: "WARM",
  spec: {
    version: 1,
    headline: "Acme is warm because its funding and hiring signals are fresh",
    personas: ["VP Sales", "CFO"],
    openers: {
      funding: {
        "VP Sales": "VP opener: Series B announced.",
        CFO: "CFO opener: Series B announced.",
      },
      hiring: {
        "VP Sales": "VP opener: Sales hiring opened.",
        CFO: "CFO opener: Sales hiring opened.",
      },
    },
    layout: [
      { type: "score_hero" },
      { type: "timing_slider", note: "{company} is {band} at {score} while {signal.funding.detail} is fresh." },
      { type: "opener_picker", default_angle: "funding", default_persona: "VP Sales" },
      {
        type: "next_steps",
        actions: [
          { label: "Plan call", prompt: "Prepare a call plan for {persona} using the {angle} angle at {company}." },
        ],
      },
    ],
  },
  contributions: [
    {
      type: "funding",
      rawScore: 65,
      effectiveWeight: 50,
      daysAgo: 0,
      observedAt: "2026-10-01T00:00:00.000Z",
      summary: "Series B announced",
      contribution: 32.5,
      status: "ok",
    },
    {
      type: "hiring",
      rawScore: 65,
      effectiveWeight: 50,
      daysAgo: 0,
      observedAt: "2026-10-01T00:00:00.000Z",
      summary: "Sales hiring opened",
      contribution: 32.5,
      status: "ok",
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LivingBrief interactions", () => {
  it("updates locally when timing, persona and prompt controls change", async () => {
    const onPrompt = vi.fn();
    const fetchMock = vi.mocked(fetch);
    const view = render(<LivingBrief block={block} handlers={{ onPrompt }} fresh={false} />);

    expect(view.container.textContent).toContain("65/100");
    expect(screen.getByText(/Freshest signal is 0 days old/)).toBeTruthy();
    expect(screen.getByText("VP opener: Series B announced.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Days before outreach"), { target: { value: "60" } });

    await waitFor(() => expect(view.container.textContent).toContain("47/100"));
    expect(screen.getByText(/Waiting 9 weeks costs/).textContent).toContain("drops it to COLD");

    fireEvent.click(screen.getByRole("button", { name: "CFO" }));
    expect(screen.getByText("CFO opener: Series B announced.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Write the full email" }));
    expect(onPrompt).toHaveBeenLastCalledWith(
      'Draft an outreach email to the CFO at Acme that leads with the funding signal. Open with: "CFO opener: Series B announced."',
    );

    fireEvent.click(screen.getByRole("button", { name: "Plan call" }));
    expect(onPrompt).toHaveBeenLastCalledWith("Prepare a call plan for CFO using the funding angle at Acme.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("decays a stored score by the days since it was scored", () => {
    // Arrange: scored 60 days ago with fresh signals at the time (v2 decay: 0.85^2 ≈ 0.72)
    const scoredAt = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const stale = { ...block, last_updated: scoredAt } as Extract<UiBlock, { type: "living_brief" }>;

    // Act
    render(<LivingBrief block={stale} handlers={{}} />);

    // Assert
    expect(screen.getByText(/was 65 WARM when scored/)).toBeTruthy();
    expect(screen.getByText(/Freshest signal is 60 days old/)).toBeTruthy();
  });
});
