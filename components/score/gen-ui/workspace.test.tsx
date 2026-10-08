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
    score_status: "complete",
    urgency: "this-week",
    buying_stage: "decision",
    icp_fit_score: 81,
    last_updated: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    type: "signal_explorer",
    axes: [
      { key: "funding", label: "Funding", score: 0, max: 25, detail: "No current funding trigger verified.", observed_at: "2026-09-10", source: "explorium", contribution: 0 },
      { key: "hiring", label: "Hiring", score: 12, max: 20, detail: "Hiring for platform roles.", observed_at: "2026-09-11", source: "scrapling", source_url: "https://stripe.com/jobs", contribution: 18 },
      { key: "news", label: "News", score: 0, max: 20, detail: "Unavailable", observed_at: null },
      { key: "technology", label: "Technology", score: 15, max: 20, detail: "New data tooling detected.", observed_at: "2026-09-12", source: "builtwith", contribution: 9 },
      { key: "web", label: "Web authority", score: 9, max: 15, detail: "Strong domain authority.", source: "open-page-rank", context: true },
    ],
  },
  {
    type: "thesis",
    summary: "Stripe shows a credible near-term buying window.",
    why_now: "Hiring and technology changes overlap this week.",
    recommended_action: "Contact the platform leader with a specific migration angle.",
  },
  { type: "action_rail", company: "Stripe", domain: "stripe.com" },
];

const render = (input: UiBlock[] = blocks, fresh = false, include?: UiBlock["type"][]) =>
  renderToStaticMarkup(<GenUiWorkspace blocks={input} handlers={{ onPrompt: () => {} }} fresh={fresh} include={include} />);

describe("GenUiWorkspace", () => {
  it("renders a legible hero with band, meter and the so-what meta row", () => {
    const html = render();
    expect(html).toContain("Stripe");
    expect(html).toContain(">82<");
    expect(html).toContain('data-band="HOT"');
    expect(html).toContain('role="meter"');
    expect(html).toContain("Act this week");
    expect(html).toContain("Decision stage");
    expect(html).toContain("ICP fit 81");
    expect(html).toContain("Fetched 2 min ago");
    expect(html).toContain("75% coverage");
  });

  it("orders why-now and the next move before the evidence", () => {
    const html = render();
    const why = html.indexOf("Why now");
    const move = html.indexOf("Recommended next move");
    const evidence = html.indexOf("Evidence");
    expect(why).toBeGreaterThan(-1);
    expect(why).toBeLessThan(move);
    expect(move).toBeLessThan(evidence);
    expect(html).toContain("Draft outreach");
  });

  it("shows human source names, contribution points and links, sorted by contribution", () => {
    const html = render();
    expect(html).toContain("Company careers page");
    expect(html).toContain("Company records");
    expect(html).toContain("Technology profile");
    expect(html).toContain("Web presence");
    expect(html).not.toContain("scrapling");
    expect(html).not.toContain("BuiltWith");
    expect(html).not.toContain("Explorium");
    expect(html).toContain("+18 pts");
    expect(html).toContain('href="https://stripe.com/jobs"');
    expect(html.indexOf("Hiring for platform roles")).toBeLessThan(html.indexOf("New data tooling detected"));
    expect(html).toContain("No current evidence available.");
  });

  it("keeps the careers label and drops third-party board links", () => {
    const boarded = blocks.map((block) => block.type === "signal_explorer"
      ? {
          ...block,
          axes: block.axes.map((axis) => axis.key === "hiring"
            ? { ...axis, source_url: "https://jobs.lever.co/acme/sales-director" }
            : axis),
        }
      : block);
    const html = render(boarded);
    expect(html).toContain("Company careers page");
    expect(html).not.toContain("jobs.lever.co");
    expect(html).not.toContain("href=\"https://jobs.lever.co/acme/sales-director\"");
  });

  it("collapses supporting context and renames the LinkedIn action", () => {
    const html = render();
    expect(html).toMatch(/<details class="[^"]*">/);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain("excluded from score");
    expect(html).toContain("Find on LinkedIn");
    expect(html).not.toContain("Open account");
  });

  it("hides MOCK markers and shows one Sample data pill for mock sources", () => {
    const mock = blocks.map((block) => block.type === "signal_explorer"
      ? { ...block, axes: block.axes.map((axis) => ({ ...axis, source: "mock", detail: axis.detail === "Unavailable" ? axis.detail : `${axis.detail} — MOCK` })) }
      : block);
    const html = render(mock);
    expect(html).not.toContain("MOCK");
    expect(html.match(/Sample data/g)?.length).toBe(1);
  });

  it("only marks the band to land on fresh scores", () => {
    expect(render(blocks, true)).toContain("score-band-land");
    expect(render(blocks, false)).not.toContain("score-band-land");
  });

  it("can render a subset while deriving sample data from the full block list", () => {
    const mock = blocks.map((block) => block.type === "signal_explorer"
      ? { ...block, axes: block.axes.map((axis) => ({ ...axis, source: "mock", detail: axis.detail === "Unavailable" ? axis.detail : `${axis.detail} — MOCK` })) }
      : block);
    const html = render(mock, false, ["intent_hero"]);

    expect(html).toContain("Stripe");
    expect(html).toContain("Sample data");
    expect(html).not.toContain("Evidence");
    expect(html).not.toContain("Hiring for platform roles");
  });

  it("does not render the retired ring or axis cards", () => {
    const html = render();
    expect(html).not.toContain("score-ring");
    expect(html).not.toContain("signal-card");
    expect(html).not.toContain("Signal explorer");
  });
});
