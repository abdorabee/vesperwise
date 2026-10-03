import { buildNewsSignal, type NewsArticleInput } from "@/lib/signals/news";
import type { SignalResult } from "@/lib/types";
import { callTreg, type TregCallResult } from "@/lib/treg";

import {
  daysAgoIsoDate,
  isRecord,
  tregFailureSignal,
  TREG_AKTA_SOURCE,
  withTregMetadata,
} from "./shared";

const ENDPOINT_ID = "akta.companies.news";
const FALLBACK_FOR = "gnews";
const MAX_COST_USD = 0.03;
const MAX_SCORE = 20;
const TIMEZONE_SUFFIX_PATTERN = /(?:z|[+-]\d{2}:?\d{2})$/i;

interface AktaNewsPayload {
  rows: Record<string, unknown>[];
}

function readNewsPayload(data: unknown): AktaNewsPayload | null {
  if (!isRecord(data) || !Array.isArray(data.data)) {
    return null;
  }

  return { rows: data.data.filter(isRecord) };
}

function normalizeHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "") || null;
  } catch {
    const host = trimmed.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase() ?? "";
    return host.replace(/^www\./, "").replace(/\.$/, "") || null;
  }
}

function hasPrimaryMention(article: Record<string, unknown>, requestedHost: string): boolean {
  if (!Array.isArray(article.company_mentions)) {
    return false;
  }

  return article.company_mentions.some((mention) => {
    if (!isRecord(mention) || mention.is_primary !== true || typeof mention.website !== "string") {
      return false;
    }

    return normalizeHost(mention.website) === requestedHost;
  });
}

function parsePublishedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const withTimezone = TIMEZONE_SUFFIX_PATTERN.test(trimmed) ? trimmed : `${trimmed}Z`;
  const date = new Date(withTimezone);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function mapArticle(row: Record<string, unknown>): NewsArticleInput | null {
  if (typeof row.title !== "string" || !row.title.trim()) {
    return null;
  }

  const publishedAt = parsePublishedAt(row.published_date);
  if (!publishedAt) {
    return null;
  }

  return {
    title: row.title.trim(),
    description: typeof row.ai_summary === "string" ? row.ai_summary : undefined,
    publishedAt,
    url: typeof row.url === "string" ? row.url : undefined,
  };
}

function unexpectedPayloadSignal(result: Extract<TregCallResult, { ok: true }>): SignalResult {
  return withTregMetadata({
    score: 0,
    max: MAX_SCORE,
    detail: "News data unavailable",
    status: "unavailable",
    observed_at: null,
    fetched_at: new Date().toISOString(),
    source: TREG_AKTA_SOURCE,
    evidence: [],
    metadata: { reason: "unexpected_payload" },
  }, result, FALLBACK_FOR);
}

export async function fetchTregNewsSignal(
  domain: string,
  signal?: AbortSignal,
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const result = await callTreg({
    endpointId: ENDPOINT_ID,
    method: "GET",
    query: { company: domain, start_date: daysAgoIsoDate(now, 30), limit: 10, group_articles: true },
    maxCostUsd: MAX_COST_USD,
    meta: { feature: "score", signal: "news" },
    signal,
  });

  if (!result.ok) {
    return tregFailureSignal({
      max: MAX_SCORE,
      source: TREG_AKTA_SOURCE,
      detail: "News data unavailable",
      result,
    });
  }

  const payload = readNewsPayload(result.data);
  const requestedHost = normalizeHost(domain);
  if (!payload || !requestedHost) {
    return unexpectedPayloadSignal(result);
  }

  const primaryRows = payload.rows.filter((row) => hasPrimaryMention(row, requestedHost));
  const articles = primaryRows.map(mapArticle).filter((article): article is NewsArticleInput => article !== null);
  const scored = buildNewsSignal(articles, now, fetchedAt, TREG_AKTA_SOURCE);
  return withTregMetadata({
    ...scored,
    metadata: {
      ...scored.metadata,
      articles_considered: articles.length,
      non_primary_articles_ignored: payload.rows.length - primaryRows.length,
    },
  }, result, FALLBACK_FOR);
}
