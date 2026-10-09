import { scrubVendorNames } from "./scrub-vendors";
import { describe, expect, it } from "vitest";

import { briefSpecSchema, BRIEF_SECTION_SCHEMAS, type BriefSpec } from "./brief-schema";
import { briefContributionsFrom, type BriefContribution } from "./brief-data";
import { projectScore } from "./decay";
import { buildFallbackBrief } from "./fallback-brief";
import { interpolate } from "./interpolate";
import { repairBrief } from "./repair-brief";
import { computeIntentScore, computeIntentScoreV3, DEFAULT_SCORING_POLICY_V3 } from "../scorer";
import type { ScoreBand, SignalContribution, SignalResult, SignalSet, SignalStatus } from "../types";

const NOW = new Date("2026-07-15T12:00:00.000Z");

function observedDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

function signal(
  score: number,
  max: number,
  status: SignalStatus = score > 0 ? "ok" : "no_signal",
  daysAgo: number | null = score > 0 ? 0 : null,
): SignalResult {
  return {
    score,
    max,
    detail: `${status} fixture`,
    status,
    observed_at: daysAgo === null ? null : observedDaysAgo(daysAgo),
    fetched_at: NOW.toISOString(),
    evidence: [],
  };
}

function signalSet(overrides: Partial<SignalSet> = {}): SignalSet {
  return {
    funding: signal(0, 25),
    hiring: signal(0, 20),
    news: signal(0, 20),
    technology: signal(0, 20),
    web: signal(0, 15),
    github: signal(0, 20),
    latestSignalDate: NOW.toISOString(),
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

const WHY_NOW_SCRUBBED = "public data leaked in a string";

describe("briefSpecSchema", () => {
  it("accepts the declarative Living Brief catalog and rejects non-catalog sections", () => {
    const spec: BriefSpec = {
      version: 1,
      headline: "Reach out while the buying window is active",
      personas: ["VP Sales", "CFO"],
      openers: {
        funding: {
          "VP Sales": "Lead with the recent funding context.",
        },
      },
      layout: [
        { type: "score_hero" },
        { type: "why_now", text: "{company} is showing {signal.funding.detail}." },
        { type: "timing_slider", note: "Waiting changes {score}." },
        { type: "signal_spotlight", signal: "funding", take: "{signal.funding.points} points are at risk." },
        {
          type: "what_would_change",
          items: [{ signal: "hiring", if: "A new hiring signal appears" }],
        },
        {
          type: "opener_picker",
          default_angle: "funding",
          default_persona: "VP Sales",
        },
      ],
    };

    const parsed = briefSpecSchema.safeParse(spec);
    const unknown = briefSpecSchema.safeParse({
      ...spec,
      layout: [{ type: "price_card" }],
    });

    expect(parsed.success).toBe(true);
    expect(unknown.success).toBe(false);
    expect(Object.keys(BRIEF_SECTION_SCHEMAS).sort()).toEqual([
      "next_steps",
      "opener_picker",
      "score_hero",
      "signal_spotlight",
      "timing_slider",
      "what_would_change",
      "why_now",
    ]);
  });
});

describe("briefContributionsFrom", () => {
  it("keeps only the four trigger signals and carries the client-safe scoring fields", () => {
    const contributions: SignalContribution[] = [
      {
        type: "funding",
        status: "ok",
        rawScore: 80,
        decayedScore: 70,
        freshness: 0.9,
        daysAgo: 5,
        summary: "Series A announced",
        baseWeight: 25,
        effectiveWeight: 25,
        contribution: 19,
        observedAt: observedDaysAgo(5),
        halfLifeDays: 180,
      },
      {
        type: "web_activity",
        status: "ok",
        rawScore: 90,
        decayedScore: 90,
        freshness: 1,
        daysAgo: 0,
        summary: "Pricing page changed",
        baseWeight: 10,
        effectiveWeight: 10,
        contribution: 9,
        observedAt: NOW.toISOString(),
        halfLifeDays: 14,
      },
    ];

    const result = briefContributionsFrom(contributions);

    expect(result).toEqual([{
      type: "funding",
      status: "ok",
      rawScore: 80,
      effectiveWeight: 25,
      daysAgo: 5,
      halfLifeDays: 180,
      observedAt: observedDaysAgo(5),
      summary: "Series A announced",
      contribution: 19,
    }]);
  });
});

describe("projectScore", () => {
  it("matches the v2 scorer at offset zero and decays monotonically", () => {
    const scored = computeIntentScore("Acme", "acme.test", signalSet({
      funding: signal(25, 25, "ok", 12),
      hiring: signal(20, 20, "ok", 4),
      news: signal(10, 20, "ok", 20),
      technology: signal(0, 20),
    }), NOW);
    const contributions = briefContributionsFrom(scored.contributions);

    const today = projectScore(contributions, 0);
    const later = projectScore(contributions, 45);
    const muchLater = projectScore(contributions, 90);

    expect(today.score).toBeCloseTo(scored.intent_score ?? 0, 0);
    expect(later.score).toBeLessThanOrEqual(today.score);
    expect(muchLater.score).toBeLessThanOrEqual(later.score);
    expect(today.perSignal.technology).toBe(0);
  });

  it("matches the v3 scorer when half-life contributions are present", () => {
    const scored = computeIntentScoreV3("Acme", "acme.test", signalSet({
      funding: signal(25, 25, "ok", 90),
      hiring: signal(20, 20, "ok", 22.5),
      news: signal(10, 20, "ok", 15),
      technology: signal(20, 20, "ok", 45),
      web_activity: signal(0, 15, "unavailable", null),
    }), NOW, DEFAULT_SCORING_POLICY_V3);
    const contributions = briefContributionsFrom(scored.contributions);

    const result = projectScore(contributions, 0);

    expect(result.score).toBeCloseTo(scored.intent_score ?? 0, 0);
    expect(result.perSignal.funding).toBeGreaterThan(0);
  });

  it("does not decay null-aged or verified no-signal contributions and can model a max override", () => {
    const contributions: BriefContribution[] = [
      {
        type: "funding",
        status: "ok",
        rawScore: 70,
        effectiveWeight: 22,
        daysAgo: null,
        observedAt: null,
        summary: "Legacy funding summary",
        contribution: 20,
      },
      {
        type: "hiring",
        status: "no_signal",
        rawScore: 0,
        effectiveWeight: 19,
        daysAgo: null,
        observedAt: null,
        summary: "No hiring signal",
        contribution: 0,
      },
    ];

    const today = projectScore(contributions, 0);
    const later = projectScore(contributions, 120);
    const withHiring = projectScore(contributions, 120, { hiring: "max" });

    expect(later.score).toBe(today.score);
    expect(withHiring.score).toBeGreaterThan(later.score);
    expect(withHiring.perSignal.hiring).toBeGreaterThan(0);
  });
});

describe("interpolate", () => {
  it("fills known refs, removes unknown refs, and reports each unknown ref once", () => {
    const context = {
      company: "Acme",
      score: 76,
      band: "HOT" as ScoreBand,
      angle: "funding" as const,
      persona: "CFO",
      contributions: [{
        type: "funding",
        rawScore: 75,
        effectiveWeight: 22,
        daysAgo: 12.4,
        observedAt: observedDaysAgo(12.4),
        summary: "Series B announced",
        contribution: 18.6,
      }] satisfies BriefContribution[],
    };

    const result = interpolate(
      "{company} is {band} at {score}. {persona}/{angle}: {signal.funding.detail}, {signal.funding.days_ago} days, {signal.funding.points} points. {signal.news.detail} {missing}",
      context,
    );

    expect(result.text).toBe("Acme is HOT at 76. CFO/funding: Series B announced, 12 days, 19 points.  ");
    expect(result.unknownRefs).toEqual(["signal.news.detail", "missing"]);
  });
});

describe("repairBrief", () => {
  it("repairs a partial streamed spec without mutating it", () => {
    const input = deepFreeze({
      version: 1,
      headline: "BuiltWith Free API says Acme is active " + "x".repeat(180),
      personas: ["VP Sales", "CFO", "A persona name that is far too long to keep untouched", 42],
      openers: {
        funding: {
          "VP Sales": "Open with GNews 401 funding context",
          Engineer: "Drop me",
        },
        technology: {
          "VP Sales": "Drop unavailable technology opener",
        },
      },
      layout: [
        { type: "why_now", text: "GNEWS_API_KEY leaked in a string", extra: true },
        { type: "score_hero" },
        { type: "signal_spotlight", signal: "funding", take: "BuiltWith 429 should not show" },
        { type: "signal_spotlight", signal: "hiring", take: "Keep hiring" },
        { type: "signal_spotlight", signal: "funding", take: "Drop third spotlight" },
        { type: "signal_spotlight", signal: "technology", take: "Drop unavailable signal" },
        {
          type: "what_would_change",
          items: [
            { signal: "funding", if: "Funding gets fresher" },
            { signal: "technology", if: "Drop unavailable item" },
          ],
        },
        { type: "opener_picker", default_angle: "technology", default_persona: "VP Sales" },
        { type: "why_now", text: "Duplicate section should drop" },
        { type: "unknown_section", text: "Nope" },
      ],
    });

    const result = repairBrief(input, { availableSignals: ["funding", "hiring"] });

    expect(result.spec).toEqual({
      version: 1,
      headline: scrubVendorNames(("BuiltWith Free API says Acme is active " + "x".repeat(180)).slice(0, 140)),
      personas: ["VP Sales", "CFO", "A persona name that is far too long to k"],
      openers: {
        funding: {
          "VP Sales": "Open with public data funding context",
        },
      },
      layout: [
        { type: "score_hero" },
        { type: "why_now", text: WHY_NOW_SCRUBBED },
        { type: "signal_spotlight", signal: "funding", take: "public data should not show" },
        { type: "signal_spotlight", signal: "hiring", take: "Keep hiring" },
        { type: "what_would_change", items: [{ signal: "funding", if: "Funding gets fresher" }] },
        { type: "opener_picker", default_angle: "funding", default_persona: "VP Sales" },
      ],
    });
    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      "moved_score_hero",
      "truncated",
      "invalid_prop",
      "unknown_prop",
      "unavailable_signal",
      "limit_exceeded",
      "duplicate_section",
      "unknown_section",
    ]));
    expect(input.layout[1]).toEqual({ type: "score_hero" });
  });

  it("inserts a score hero when another valid section arrives first", () => {
    const result = repairBrief({
      version: 1,
      headline: "Partial brief",
      personas: ["VP Sales"],
      layout: [{ type: "timing_slider" }],
    }, { availableSignals: ["funding"] });

    expect(result.spec?.layout).toEqual([{ type: "score_hero" }, { type: "timing_slider" }]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "inserted_score_hero" }));
  });

  it("keeps a headline-only partial brief by inserting the score hero", () => {
    const result = repairBrief({ version: 1, headline: "Early streamed headline" }, { availableSignals: ["funding"] });

    expect(result.spec).toEqual({
      version: 1,
      headline: "Early streamed headline",
      personas: ["VP Sales"],
      openers: {},
      layout: [{ type: "score_hero" }],
    });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "inserted_score_hero" }));
  });

  it("returns null for input with no usable brief content", () => {
    const result = repairBrief({ version: 1, layout: [{ type: "unknown_section" }] }, { availableSignals: ["funding"] });

    expect(result.spec).toBeNull();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "unknown_section" }));
  });
});

describe("buildFallbackBrief", () => {
  const contributions: BriefContribution[] = [
    { type: "funding", status: "ok", rawScore: 90, effectiveWeight: 22, daysAgo: 4, observedAt: observedDaysAgo(4), summary: "Series B announced", contribution: 25 },
    { type: "hiring", status: "ok", rawScore: 55, effectiveWeight: 19, daysAgo: 12, observedAt: observedDaysAgo(12), summary: "Revenue roles posted", contribution: 12 },
    { type: "news", status: "no_signal", rawScore: 0, effectiveWeight: 18, daysAgo: null, observedAt: null, summary: "No news signal", contribution: 0 },
    { type: "technology", status: "ok", rawScore: 30, effectiveWeight: 18, daysAgo: 30, observedAt: observedDaysAgo(30), summary: "Stack changed", contribution: 6 },
  ];

  it.each([
    ["HOT", ["score_hero", "why_now", "opener_picker", "timing_slider", "next_steps"]],
    ["WARM", ["score_hero", "timing_slider", "signal_spotlight", "opener_picker", "next_steps"]],
    ["COLD", ["score_hero", "what_would_change", "timing_slider", "next_steps"]],
  ] as const)("builds a deterministic %s brief that repair keeps unchanged", (band, sectionTypes) => {
    const spec = buildFallbackBrief({
      company: "Acme",
      score: band === "HOT" ? 82 : band === "WARM" ? 61 : 34,
      band,
      contributions,
    });
    const repaired = repairBrief(spec, { availableSignals: contributions.map((item) => item.type) });

    expect(spec.layout.map((section) => section.type)).toEqual(sectionTypes);
    expect(spec.personas).toEqual(["VP Sales", "RevOps lead", "CFO"]);
    expect(repaired.spec).toEqual(spec);
    expect(repaired.diagnostics).toEqual([]);
    for (const byPersona of Object.values(spec.openers)) {
      for (const text of Object.values(byPersona ?? {})) {
        expect(text).toContain("{company}");
        expect(text).toMatch(/\{signal\.(funding|hiring|news|technology)\.detail\}/);
        expect(text).not.toContain("82");
        expect(text).not.toContain("61");
        expect(text).not.toContain("34");
      }
    }
  });
});

describe("scrubVendorNames", () => {
  it("replaces vendor names inline and keeps the sentence", () => {
    expect(scrubVendorNames("Explorium funding 200 shows a Series B; BuiltWith adds Snowflake"))
      .toBe("public data funding 200 shows a Series B; public data adds Snowflake");
    expect(scrubVendorNames("GNews 429 and OPENROUTER_API_KEY")).toBe("public data and public data");
    expect(scrubVendorNames("Hiring six AEs")).toBe("Hiring six AEs");
  });
});
