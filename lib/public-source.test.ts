import { describe, expect, it } from "vitest";
import { isCareersBoardUrl, redactPublicSources, toPublicSourceId } from "./public-source";

describe("toPublicSourceId", () => {
  it.each([
    ["explorium", "company"],
    ["treg-aviato", "company"],
    ["treg-predictleads", "company"],
    ["treg-hunter", "company"],
    ["explorium-events", "hiring"],
    ["gnews", "news"],
    ["treg-akta", "news"],
    ["builtwith", "technology"],
    ["open-page-rank", "web"],
    ["firecrawl", "website"],
    ["firecrawl-change-tracking", "website"],
    ["scrapling", "careers"],
    ["github", "github"],
    ["mock", "mock"],
  ])("maps %s to %s", (internal, publicId) => {
    expect(toPublicSourceId(internal)).toBe(publicId);
  });
});

describe("redactPublicSources", () => {
  it("rewrites signal, evidence, metadata, and contribution source ids", () => {
    const payload = redactPublicSources({
      signals: {
        funding: {
          source: "treg-aviato",
          evidence: [{ source: "explorium", label: "Round" }],
          metadata: {
            source: "explorium",
            selected_source: "treg-hunter",
            fallback_source: "treg-predictleads",
          },
        },
        hiring: { source: "explorium-events" },
        news: { source: "gnews" },
        technology: { source: "builtwith" },
        web: { source: "open-page-rank" },
        web_activity: { source: "firecrawl-change-tracking" },
        github: { source: "github" },
      },
      contributions: [{ selectedSource: "scrapling" }, { selectedSource: "treg-akta" }],
    });

    expect(payload.signals.funding.source).toBe("company");
    expect(payload.signals.funding.evidence[0].source).toBe("company");
    expect(payload.signals.funding.metadata).toEqual({
      source: "company",
      selected_source: "company",
      fallback_source: "company",
    });
    expect(payload.signals.hiring.source).toBe("hiring");
    expect(payload.signals.news.source).toBe("news");
    expect(payload.signals.technology.source).toBe("technology");
    expect(payload.signals.web.source).toBe("web");
    expect(payload.signals.web_activity.source).toBe("website");
    expect(payload.signals.github.source).toBe("github");
    expect(payload.contributions.map((item) => item.selectedSource)).toEqual(["careers", "news"]);
    expect(JSON.stringify(payload)).not.toMatch(/explorium|gnews|builtwith|firecrawl|scrapling|aviato|predictleads|hunter|akta/i);
  });

  it("rewrites stored vendor sentences without touching the company name", () => {
    const payload = redactPublicSources({
      company: "Hunter Industries",
      ai_summary: "Hunter Industries raised a round.",
      signals: {
        web: { detail: "Established domain (OPR: 6/10)", evidence: [{ label: "Open PageRank 6/10" }] },
        technology: { detail: "Technology change data unavailable from the BuiltWith Free API" },
        funding: { metadata: { reason: "Explorium funding 503" } },
        news: { detail: "News API not configured — GNEWS_API_KEY missing" },
        web_activity: { metadata: { reason: "awaiting_firecrawl_change_baseline" } },
      },
    });

    expect(payload.company).toBe("Hunter Industries");
    expect(payload.ai_summary).toBe("Hunter Industries raised a round.");
    expect(payload.signals.web.detail).toBe("Web presence 6/10");
    expect(payload.signals.web.evidence[0].label).toBe("Web presence 6/10");
    expect(payload.signals.technology.detail).toBe("Technology data unavailable");
    expect(payload.signals.funding.metadata.reason).toBe("Source unavailable");
    expect(payload.signals.news.detail).toBe("News data unavailable");
    expect(payload.signals.web_activity.metadata.reason).toBe("awaiting_change_baseline");
  });
});

describe("isCareersBoardUrl", () => {
  it.each([
    "https://boards.greenhouse.io/acme/jobs/42",
    "https://job-boards.greenhouse.io/acme/jobs/42",
    "https://jobs.lever.co/acme/sales",
    "https://jobs.ashbyhq.com/acme/1",
    "https://apply.workable.com/acme/j/1",
  ])("hides %s", (url) => {
    expect(isCareersBoardUrl(url)).toBe(true);
  });

  it("keeps a first-party careers page", () => {
    expect(isCareersBoardUrl("https://acme.com/careers")).toBe(false);
    expect(isCareersBoardUrl("not a url")).toBe(false);
  });
});
