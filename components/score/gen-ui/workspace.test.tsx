import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { GenUiWorkspace } from "./workspace";

const blocks: UiBlock[] = [
  {
    type: "intent_hero",
    company: "Stripe",
    domain: "stripe.com",
    intent_score: 82,
    score_band: "HOT",
    data_coverage: 0.75,
    score_status: "scored",
  },
  {
    type: "signal_explorer",
    axes: [
      { key: "funding", label: "Funding", score: 0, max: 25, detail: "No current funding trigger verified.", observed_at: "2026-09-10", source: "Crunchbase" },
      { key: "hiring", label: "Hiring", score: 12, max: 20, detail: "Hiring for platform roles.", observed_at: "2026-09-11", source: "Careers" },
      { key: "news", label: "News", score: 0, max: 20, detail: "Unavailable", observed_at: null },
      { key: "technology", label: "Technology", score: 15, max: 20, detail: "New data tooling detected.", observed_at: "2026-09-12", source: "BuiltWith" },
      { key: "web", label: "Web authority", score: 9, max: 15, detail: "Strong domain authority.", context: true },
    ],
  },
  {
    type: "thesis",
    summary: "Stripe shows a credible near-term buying window.",
    why_now: "Hiring and technology changes overlap this week.",
    recommended_action: "Contact the platform leader with a specific migration angle.",
  },
];

describe("GenUiWorkspace", () => {
  it("renders an inline score heading and source-backed evidence table", () => {
    const html = renderToStaticMarkup(<GenUiWorkspace blocks={blocks} handlers={{}} />);

    expect(html).toContain("Stripe");
    expect(html).toContain("82");
    expect(html).toContain("HOT");
    expect(html).toContain("Signal");
    expect(html).toContain("Current read");
    expect(html).toContain("Dated evidence");
    expect(html).toContain("0 / 25");
    expect(html).toContain("Unavailable");
    expect(html).toContain("Supporting context");
    expect(html).toContain("excluded from score");
  });

  it("does not render the retired ring, axis cards, or nested evidence controls", () => {
    const html = renderToStaticMarkup(<GenUiWorkspace blocks={blocks} handlers={{}} />);

    expect(html).not.toContain("score-ring");
    expect(html).not.toContain("signal-card");
    expect(html).not.toContain("aria-pressed");
    expect(html).not.toContain("Signal explorer");
  });
});
