import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { buildScoreReport, ScoreReportPanel, tabGroupsForBlocks } from "./score-report-panel";

const blocks: UiBlock[] = [
  { type: "intent_hero", company: "Ramp", domain: "ramp.com", intent_score: 78, score_band: "HOT" },
  { type: "thesis", summary: "Ramp has urgent finance automation signals.", recommended_action: "Open with hiring momentum." },
  { type: "signal_explorer", axes: [{ key: "hiring", label: "Hiring", score: 15, max: 20, detail: "Hiring revops.", observed_at: "2026-10-01", source: "scrapling" }] },
  { type: "outreach_studio", company: "Ramp", subject: "Revops hiring", talk_track: "Saw the new roles." },
  { type: "action_rail", company: "Ramp", domain: "ramp.com" },
];

describe("ScoreReportPanel", () => {
  it("splits blocks into visible Overview, Evidence and Outreach tabs", () => {
    expect(tabGroupsForBlocks(blocks).map((tab) => tab.label)).toEqual(["Overview", "Evidence", "Outreach"]);
  });

  it("hides empty tabs and removes the tablist when only one tab has blocks", () => {
    const report = buildScoreReport("m1", [blocks[0], blocks[4]], { current: true });
    const html = renderToStaticMarkup(
      <ScoreReportPanel report={report} handlers={{}} busy={false} onClose={() => {}} onRescore={() => {}} />,
    );

    expect(html).toContain("Ramp");
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain("Evidence");
    expect(html).not.toContain("Outreach");
  });

  it("renders stored result controls at the top of the panel body", () => {
    const report = buildScoreReport("m1", blocks, {
      current: true,
      stored: { domain: "ramp.com", createdAt: "2026-10-01T12:00:00.000Z" },
    });
    const html = renderToStaticMarkup(
      <ScoreReportPanel report={report} handlers={{}} busy={false} onClose={() => {}} onRescore={() => {}} />,
    );

    expect(html.indexOf("Stored result")).toBeLessThan(html.indexOf("Overview"));
    expect(html).toContain("Rescore · 1 credit");
  });
});
