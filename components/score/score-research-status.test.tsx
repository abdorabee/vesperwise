import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyResearchEvent, EMPTY_RESEARCH_PROGRESS, ScoreResearchStatus } from "./score-research-status";

describe("ScoreResearchStatus", () => {
  it("shows every source as checking until its provider really lands", () => {
    const html = renderToStaticMarkup(<ScoreResearchStatus progress={EMPTY_RESEARCH_PROGRESS} />);
    expect(html).toContain("Verifying current signals");
    expect(html.match(/data-state="checking"/g)).toHaveLength(4);
    expect(html).toContain("0 of 4 checked");
  });

  it("fills rows in place from real events, then announces synthesis", () => {
    let progress = applyResearchEvent(EMPTY_RESEARCH_PROGRESS, {
      type: "signal_done",
      key: "funding",
      status: "ok",
      detail: "Series B closed 42 days ago ($22M) — MOCK",
      observed_at: new Date(Date.now() - 42 * 86_400_000).toISOString(),
      source: "mock",
    });
    progress = applyResearchEvent(progress, { type: "signal_done", key: "news", status: "no_signal", source: "gnews" });
    let html = renderToStaticMarkup(<ScoreResearchStatus progress={progress} />);
    expect(html.match(/data-state="landed"/g)).toHaveLength(2);
    expect(html).toContain("Series B closed 42 days ago ($22M)");
    expect(html).not.toContain("MOCK");
    expect(html).toContain("42 d ago");
    expect(html).toContain("none found");
    expect(html).toContain("News coverage");
    expect(html).toContain("2 of 4 checked");

    progress = applyResearchEvent(progress, { type: "reasoning_start" });
    html = renderToStaticMarkup(<ScoreResearchStatus progress={progress} />);
    expect(html).toContain("Synthesising why-now…");
  });
});
