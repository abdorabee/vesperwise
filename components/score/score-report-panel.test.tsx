import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { UiBlock } from "@/lib/gen-ui";
import { buildScoreReport, ScoreReportPanel, tabGroupsForBlocks } from "./score-report-panel";

const livingBrief: UiBlock = {
  type: "living_brief",
  company: "Ramp",
  domain: "ramp.com",
  intent_score: 78,
  score_band: "HOT",
  spec: {
    version: 1,
    headline: "Ramp is ready for a focused outbound motion",
    personas: ["VP Sales"],
    openers: {
      hiring: {
        "VP Sales": "Lead with {signal.hiring.detail}.",
      },
    },
    layout: [
      { type: "score_hero" },
      { type: "why_now", text: "{company} is {band} because {signal.hiring.detail}." },
    ],
  },
  contributions: [
    {
      type: "hiring",
      rawScore: 80,
      effectiveWeight: 20,
      daysAgo: 4,
      observedAt: "2026-10-01T00:00:00.000Z",
      summary: "Hiring revops.",
      contribution: 18,
      status: "ok",
    },
  ],
};

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

  it("puts living briefs on Overview while preserving the legacy hero and thesis fallback", () => {
    expect(tabGroupsForBlocks([livingBrief]).map((tab) => tab.label)).toEqual(["Overview"]);
    expect(tabGroupsForBlocks([blocks[0], blocks[1]]).map((tab) => tab.label)).toEqual(["Overview"]);

    const html = renderToStaticMarkup(
      <ScoreReportPanel report={buildScoreReport("living", [livingBrief], { current: true })} handlers={{}} busy={false} onClose={() => {}} onRescore={() => {}} />,
    );
    expect(html).toContain("Ramp");
    expect(html).not.toContain("Earlier result");
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

  it("shows a page-specific extra tab first and selects it by default", () => {
    const report = buildScoreReport("m2", blocks, { current: false, restored: true });
    const html = renderToStaticMarkup(
      <ScoreReportPanel
        report={report}
        handlers={{}}
        busy={false}
        onClose={() => {}}
        onRescore={() => {}}
        extraTab={{ value: "pipeline", label: "Pipeline", content: <p>Stage controls</p> }}
        closeLabel="Close account panel"
      />,
    );

    const labels = [...html.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((match) => match[1]);
    expect(labels).toEqual(["Pipeline", "Overview", "Evidence", "Outreach"]);
    expect(html).toContain("Stage controls");
    expect(html).toContain('aria-label="Close account panel"');
  });

  it("renders the extra tab alone when the report has no tab content", () => {
    const report = buildScoreReport("m3", [blocks[4]], { current: false });
    const html = renderToStaticMarkup(
      <ScoreReportPanel report={report} handlers={{}} busy={false} onClose={() => {}} onRescore={() => {}} extraTab={{ value: "run", label: "Run #A1B2", content: <p>Run snapshot</p> }} />,
    );

    expect(html).toContain("Run snapshot");
    expect(html).not.toContain('role="tablist"');
  });

  it("renders a streamed LivingBrief under research status while a score is pending", () => {
    const report = {
      kind: "pending" as const,
      id: "pending-1",
      messageId: "pending-1",
      label: "ramp.com",
      company: "Ramp",
      domain: "ramp.com",
      progress: { signals: {}, reasoning: "running" as const },
      score: {
        type: "score_ready" as const,
        company: "Ramp",
        domain: "ramp.com",
        intent_score: 78,
        score_band: "HOT" as const,
        last_updated: "2026-10-09T12:00:00.000Z",
        contributions: livingBrief.contributions,
      },
      brief: livingBrief.spec,
    };

    const html = renderToStaticMarkup(
      <ScoreReportPanel report={report} handlers={{ onPrompt: () => {} }} busy={true} onClose={() => {}} onRescore={() => {}} />,
    );

    expect(html).toContain("Synthesising why-now");
    expect(html).toContain("Living Brief");
    expect(html).toContain("Ramp is ready for a focused outbound motion");
    expect(html).toContain("disabled");
  });
});
