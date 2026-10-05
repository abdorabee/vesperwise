import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { buildScoreReports, getNextCompanyTabIndex } from "./score-report-model";
import { ScoreCompanyTabs } from "./score-company-tabs";

type HeroBlock = Extract<UiBlock, { type: "intent_hero" }>;

const rampHero: HeroBlock = { type: "intent_hero", company: "Ramp", domain: "ramp.com", intent_score: 78, score_band: "HOT" };
const rampBlocks: UiBlock[] = [
  rampHero,
  { type: "action_rail", company: "Ramp", domain: "ramp.com" },
];

const stripeBlocks: UiBlock[] = [
  { type: "intent_hero", company: "Stripe", domain: "stripe.com", intent_score: 52, score_band: "WARM" },
  { type: "action_rail", company: "Stripe", domain: "stripe.com" },
];

describe("ScoreCompanyTabs", () => {
  it("dedupes by domain and keeps the latest report selected", () => {
    const reports = buildScoreReports([
      { id: "old-ramp", role: "assistant", kind: "ui", blocks: rampBlocks, restored: true },
      { id: "stripe", role: "assistant", kind: "ui", blocks: stripeBlocks },
      { id: "new-ramp", role: "assistant", kind: "ui", blocks: [{ ...rampHero, intent_score: 84 }, rampBlocks[1]] },
    ]);

    expect(reports.map((report) => report.id)).toEqual(["stripe", "new-ramp"]);
    const latest = reports.at(-1);
    expect(latest?.kind === "ui" ? latest.score : undefined).toBe(84);
    expect(reports.at(-1)?.id).toBe("new-ramp");
  });

  it("renders running score tabs with a thinking orb", () => {
    const reports = buildScoreReports([
      { id: "run-ramp", role: "assistant", kind: "thinking", mode: "score", domain: "ramp.com" },
    ]);
    const html = renderToStaticMarkup(<ScoreCompanyTabs reports={reports} selectedId="run-ramp" onSelect={() => {}} />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain("ramp.com");
    expect(html).toContain("score-thinking-orb");
  });

  it("moves selection predictably with arrow keys", () => {
    expect(getNextCompanyTabIndex(0, 3, "ArrowRight")).toBe(1);
    expect(getNextCompanyTabIndex(0, 3, "ArrowLeft")).toBe(2);
    expect(getNextCompanyTabIndex(1, 3, "Home")).toBe(0);
    expect(getNextCompanyTabIndex(1, 3, "End")).toBe(2);
    expect(getNextCompanyTabIndex(1, 3, "Enter")).toBe(1);
  });
});
