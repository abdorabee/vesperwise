import { describe, expect, it } from "vitest";
import { storedScoreFromRow } from "./stored-score";

describe("storedScoreFromRow", () => {
  it("maps a scores row to a restorable workspace score", () => {
    const score = storedScoreFromRow({
      domain: "acme.io",
      company_name: "Acme",
      score: 84,
      score_band: "HOT",
      ai_summary: "Summary",
      urgency: "this-week",
      data_coverage: "0.75",
      icp_fit_score: 81,
      contributions: [{ type: "funding", contribution: 21 }],
      signals: { funding: { score: 20, max: 25, detail: "Series B" } },
      created_at: "2026-09-27T10:00:00.000Z",
    });
    expect(score).toMatchObject({
      company: "Acme",
      intent_score: 84,
      score_band: "HOT",
      data_coverage: 0.75,
      icp_fit_score: 81,
      last_updated: "2026-09-27T10:00:00.000Z",
    });
    expect(score?.contributions).toHaveLength(1);
  });

  it("rejects rows without a usable score", () => {
    expect(storedScoreFromRow(null)).toBeNull();
    expect(storedScoreFromRow({ domain: "acme.io", score: 10, score_band: "LUKEWARM", created_at: "2026-09-27" })).toBeNull();
  });
});
