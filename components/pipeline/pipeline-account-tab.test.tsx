import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PipelineCompany } from "@/app/api/dashboard/pipeline/route";
import { PipelineAccountTab } from "./pipeline-account-tab";

const company = {
  domain: "ramp.com",
  company_name: "Ramp",
  score: 78,
  score_band: "HOT",
  pipeline_stage: "warming",
  trend: 6,
  urgency: "this-week",
  score_status: "complete",
  data_coverage: 0.8,
  score_id: null,
  outcome: null,
  key_triggers: ["Hiring RevOps"],
  email_subject: "RevOps hiring",
  talk_track: "Saw the new roles.",
} as unknown as PipelineCompany;

function render(overrides: Partial<PipelineCompany> = {}, outcomeError: string | null = null) {
  return renderToStaticMarkup(
    <PipelineAccountTab
      company={{ ...company, ...overrides }}
      rescoring={false}
      outcomeSaving={false}
      outcomeError={outcomeError}
      onStageChange={() => {}}
      onOutcome={() => {}}
      onRescore={() => {}}
    />,
  );
}

describe("PipelineAccountTab", () => {
  it("keeps every control the old dialog had", () => {
    const html = render();
    expect(html).toContain("Pipeline Stage");
    expect(html).toContain("Score outcome");
    expect(html).toContain("Hiring RevOps");
    expect(html).toContain("RevOps hiring");
    expect(html).toContain("Copy Email + Talk Track");
    expect(html).toContain("Re-score");
    expect(html).toContain("LinkedIn");
    expect(html).toContain("80% coverage");
  });

  it("marks the current stage as pressed", () => {
    expect(render()).toMatch(/aria-pressed="true"[^>]*>Warming</);
  });

  it("explains disabled outcomes without a score snapshot and shows save errors", () => {
    const html = render({}, "Unable to save outcome");
    expect(html).toContain("Re-score this account to attach an outcome");
    expect(html).toContain("Unable to save outcome");
  });
});
