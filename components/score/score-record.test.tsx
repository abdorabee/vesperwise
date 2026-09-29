import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScoreRecord } from "./score-record";
import type { ScoreRecordData } from "@/lib/score-record";

const record: ScoreRecordData = {
  id: "domain:linear.app",
  kind: "domain",
  target: "linear.app",
  company: "Linear",
  domain: "linear.app",
  email: null,
  score: 82,
  band: "HOT",
  whyNow: "Hiring and a stack change landed this month.",
  action: "Send the note this week.",
  updatedAt: "2026-09-28T00:00:00.000Z",
  cached: false,
  thinCoverage: false,
  companyScore: null,
  owner: "You",
};

describe("ScoreRecord", () => {
  it("shows the band, the score, and the real signal weights", () => {
    const html = renderToStaticMarkup(<ScoreRecord record={record} />);
    expect(html).toContain("linear.app");
    expect(html).toContain("HOT");
    expect(html).toContain("Funding 22");
    expect(html).toContain("Hiring 19");
    expect(html).not.toContain("Domain");
    expect(html).not.toContain("weights, not the 0–100");
  });
});
