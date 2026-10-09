import { describe, expect, it } from "vitest";

import type { BriefSpec } from "@/lib/brief";
import { EMPTY_RESEARCH_PROGRESS } from "./score-research-status";
import { buildScoreReports } from "./score-report-model";

const brief: BriefSpec = {
  version: 1,
  headline: "Acme is warming up",
  personas: ["VP Sales"],
  openers: {},
  layout: [
    { type: "score_hero" },
    { type: "timing_slider", note: "{company} is {band} at {score}." },
  ],
};

const score = {
  type: "score_ready",
  company: "Acme",
  domain: "acme.io",
  intent_score: 64,
  score_band: "WARM",
  data_coverage: 0.78,
  last_updated: "2026-10-09T12:00:00.000Z",
  contributions: [{
    type: "hiring",
    rawScore: 70,
    effectiveWeight: 19,
    daysAgo: 5,
    observedAt: "2026-10-04T12:00:00.000Z",
    summary: "Hiring sales leaders",
    contribution: 18,
    status: "ok",
  }],
};

describe("pending score reports", () => {
  it("carry streamed score and brief state without marking reasoning done", () => {
    const reports = buildScoreReports([{
      id: "thinking-1",
      role: "assistant",
      kind: "thinking",
      mode: "score",
      tools: [],
      domain: "acme.io",
      progress: { ...EMPTY_RESEARCH_PROGRESS, reasoning: "running" },
      score,
      brief,
    } as never]);

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      kind: "pending",
      company: "Acme",
      domain: "acme.io",
      score,
      brief,
      progress: { reasoning: "running" },
    });
  });
});
