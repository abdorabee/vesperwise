import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DbScore } from "@/lib/types";
import { HistoryRunTab, runId } from "./history-run-tab";

const row = {
  id: "score-0000-abcd",
  domain: "stripe.com",
  company_name: "Stripe",
  score: 64,
  score_band: "WARM",
  buying_stage: "consideration",
  urgency: "this-week",
  created_at: "2026-09-30T10:00:00Z",
  ai_summary: "Stripe is expanding its finance team.",
  model_fallback: false,
  why_now: "New CFO hire.",
  recommended_action: "Reach the CFO.",
  signals: null,
  email_subject: "Finance team growth",
  talk_track: null,
  scoring_version: "v4",
} as unknown as DbScore;

describe("HistoryRunTab", () => {
  it("shows the snapshot of the clicked run", () => {
    const html = renderToStaticMarkup(<HistoryRunTab row={row} delta={{ direction: "up", diff: 6, from: 58 }} lastScoreHref="/score?domain=stripe.com&view=last" />);
    expect(html).toContain(`Run #${runId(row.id)}`);
    expect(html).toContain("Consideration");
    expect(html).toContain("▲ 6 from 58");
    expect(html).toContain("Stripe is expanding its finance team.");
    expect(html).toContain("Reach the CFO.");
    expect(html).toContain("Finance team growth");
    expect(html).toContain('href="/score?domain=stripe.com&amp;view=last"');
  });

  it("shows a dash for a first run", () => {
    const html = renderToStaticMarkup(<HistoryRunTab row={row} delta={{ direction: "first", diff: 0, from: 0 }} lastScoreHref="/score" />);
    expect(html).toContain("—");
  });
});
