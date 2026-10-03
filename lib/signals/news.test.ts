import { describe, expect, it } from "vitest";
import { scoreNewsArticles } from "./news";

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("scoreNewsArticles", () => {
  it("deduplicates syndicated headlines before scoring", () => {
    const result = scoreNewsArticles([
      {
        title: "Acme launches new product - Reuters",
        description: "Acme introduces its workflow platform.",
        publishedAt: "2026-07-14T12:00:00.000Z",
        url: "https://example.com/acme-product",
      },
      {
        title: "Acme launches new product | TechCrunch",
        description: "The company announces the same platform.",
        publishedAt: "2026-07-14T13:00:00.000Z",
      },
    ], NOW);

    expect(result.score).toBe(5); // product-launch category, counted once
    expect(result.duplicateCount).toBe(1);
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toMatchObject({
      source: "gnews",
      fetched_at: NOW.toISOString(),
      source_url: "https://example.com/acme-product",
    });
  });

  it("excludes funding-only coverage from the news score", () => {
    const result = scoreNewsArticles([
      {
        title: "Acme raised Series B funding",
        description: "The investment round totaled $30 million.",
        publishedAt: "2026-07-14T12:00:00.000Z",
      },
    ], NOW);

    expect(result.score).toBe(0);
    expect(result.fundingOnlyCount).toBe(1);
    expect(result.observedAt).toBeNull();
  });

  it("excludes a funding story even when it contains another trigger phrase", () => {
    const result = scoreNewsArticles([
      {
        title: "After funding, Acme launches a new product",
        publishedAt: "2026-07-13T12:00:00.000Z",
      },
    ], NOW);

    expect(result.score).toBe(0);
    expect(result.details).toEqual([]);
    expect(result.fundingOnlyCount).toBe(1);
  });

  it("uses the newest positive article timestamp and skips invalid dates", () => {
    const result = scoreNewsArticles([
      {
        title: "Acme opens office in Cairo",
        publishedAt: "2026-07-01T12:00:00.000Z",
      },
      {
        title: "Acme appoints new CEO",
        publishedAt: "2026-07-12T12:00:00.000Z",
      },
      {
        title: "Acme launches invalid dated product",
        publishedAt: "not-a-date",
      },
    ], NOW);

    expect(result.score).toBe(11);
    expect(result.observedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(result.evidence).toHaveLength(2);
  });
});

describe("buildNewsSignal", () => {
  it("stamps a custom source on the news signal and evidence", async () => {
    const { buildNewsSignal } = await import("./news");

    const result = buildNewsSignal([
      {
        title: "Acme launches new product",
        description: "Acme introduces its workflow platform.",
        publishedAt: "2026-07-14T12:00:00.000Z",
        url: "https://example.com/acme-product",
      },
    ], NOW, NOW.toISOString(), "treg-akta");

    expect(result).toMatchObject({
      status: "ok",
      score: 5,
      observed_at: "2026-07-14T12:00:00.000Z",
      source: "treg-akta",
    });
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence?.[0]).toMatchObject({
      source: "treg-akta",
      fetched_at: NOW.toISOString(),
      source_url: "https://example.com/acme-product",
    });
  });

  it("returns no-signal for an empty article list", async () => {
    const { buildNewsSignal } = await import("./news");

    const result = buildNewsSignal([], NOW, NOW.toISOString());

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      source: "gnews",
      detail: "No significant non-funding trigger events detected",
      metadata: {
        duplicate_articles_ignored: 0,
        funding_only_articles_ignored: 0,
      },
    });
    expect(result.evidence).toEqual([]);
  });
});
