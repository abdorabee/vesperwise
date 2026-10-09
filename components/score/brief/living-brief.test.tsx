import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { buildFallbackBrief, type BriefContribution } from "@/lib/brief";
import { LivingBrief } from "./living-brief";

type LivingBriefBlock = Extract<UiBlock, { type: "living_brief" }>;

const warmContributions: BriefContribution[] = [
  {
    type: "funding",
    rawScore: 74,
    effectiveWeight: 25,
    daysAgo: 6,
    observedAt: "2026-10-01T00:00:00.000Z",
    summary: "Series B announced",
    contribution: 22,
    status: "ok",
  },
  {
    type: "hiring",
    rawScore: 58,
    effectiveWeight: 20,
    daysAgo: 10,
    observedAt: "2026-09-27T00:00:00.000Z",
    summary: "Sales leadership roles opened",
    contribution: 18,
    status: "ok",
  },
];

const coldContributions: BriefContribution[] = [
  {
    type: "funding",
    rawScore: 0,
    effectiveWeight: 25,
    daysAgo: null,
    observedAt: null,
    summary: "No qualifying funding signal",
    contribution: 0,
    status: "no_signal",
  },
  {
    type: "hiring",
    rawScore: 34,
    effectiveWeight: 20,
    daysAgo: 45,
    observedAt: "2026-08-23T00:00:00.000Z",
    summary: "A small sales hiring cluster",
    contribution: 9,
    status: "stale",
  },
];

function blockFor(band: "WARM" | "COLD", score: number, contributions: BriefContribution[]): LivingBriefBlock {
  return {
    type: "living_brief",
    company: "Acme",
    domain: "acme.com",
    intent_score: score,
    score_band: band,
    spec: buildFallbackBrief({ company: "Acme", score, band, contributions }),
    contributions,
  };
}

function render(block: LivingBriefBlock) {
  return renderToStaticMarkup(<LivingBrief block={block} handlers={{}} fresh={false} />);
}

describe("LivingBrief static rendering", () => {
  it("renders the WARM fallback brief in spec order without raw refs", () => {
    const html = render(blockFor("WARM", 63, warmContributions));

    expect(html).toContain("Acme is WARM for timely outreach");
    expect(html).toContain(">63<");
    expect(html).not.toContain("{");
    expect(html.indexOf("If you reach out in")).toBeLessThan(html.indexOf("Signal spotlight"));
    expect(html.indexOf("Signal spotlight")).toBeLessThan(html.indexOf("Opening angle"));
    expect(html.indexOf("Opening angle")).toBeLessThan(html.indexOf("Next steps"));
  });

  it("renders the COLD fallback brief in spec order without raw refs", () => {
    const html = render(blockFor("COLD", 34, coldContributions));

    expect(html).toContain("Acme is COLD for timely outreach");
    expect(html).toContain(">34<");
    expect(html).not.toContain("{");
    expect(html.indexOf("What would change")).toBeLessThan(html.indexOf("If you reach out in"));
    expect(html.indexOf("If you reach out in")).toBeLessThan(html.indexOf("Next steps"));
  });
});
