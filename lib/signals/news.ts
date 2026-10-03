import type { SignalEvidence, SignalResult } from "@/lib/types";

const SOURCE = "gnews";

export interface NewsArticleInput {
  title: string;
  description?: string;
  publishedAt: string;
  url?: string;
}

export type GNewsArticle = NewsArticleInput;

interface GNewsResponse {
  articles: GNewsArticle[];
}

const POSITIVE_TRIGGERS: Array<{ keywords: string[]; pts: number; label: string }> = [
  { keywords: ["ceo", "cto", "cmo", "chief", "vp ", "vice president", "appointed", "joins as"], pts: 7, label: "leadership change" },
  { keywords: ["launches", "launch", "introduces", "announces", "new product"], pts: 5, label: "product launch" },
  { keywords: ["partnership", "acquires", "acquisition", "merger"], pts: 5, label: "strategic partnership/M&A" },
  { keywords: ["expansion", "expands", "opens office", "new market"], pts: 4, label: "expansion" },
];

const FUNDING_KEYWORDS = ["raised", "funding", "series", "seed round", "investment round"];

const NEGATIVE_TRIGGERS: Array<{ keywords: string[]; pts: number; label: string }> = [
  { keywords: ["layoffs", "laid off", "reduces workforce", "cuts jobs"], pts: -10, label: "layoffs" },
  { keywords: ["scandal", "fraud", "lawsuit", "investigation"], pts: -8, label: "controversy" },
];

function canonicalHeadline(title: string): string {
  const withoutPublisher = title.split(/\s[-–—|]\s/)[0] ?? title;
  return withoutPublisher
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArticleDate(value: string, now: Date): Date | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (date.getTime() - now.getTime() > 86_400_000) return null;
  return date;
}

interface NewsScoreResult {
  score: number;
  details: string[];
  evidence: SignalEvidence[];
  observedAt: string | null;
  duplicateCount: number;
  fundingOnlyCount: number;
}

export function scoreNewsArticles(
  articles: NewsArticleInput[],
  now = new Date(),
  fetchedAt = now.toISOString(),
  source: string = SOURCE
): NewsScoreResult {
  let totalScore = 0;
  let duplicateCount = 0;
  let fundingOnlyCount = 0;
  const details: string[] = [];
  const evidence: SignalEvidence[] = [];
  const seen = new Set<string>();
  const positiveDates: Date[] = [];

  for (const article of articles) {
    const canonical = canonicalHeadline(article.title);
    if (!canonical || seen.has(canonical)) {
      duplicateCount++;
      continue;
    }
    seen.add(canonical);

    const publishedAt = parseArticleDate(article.publishedAt, now);
    if (!publishedAt) continue;

    const text = `${article.title} ${article.description ?? ""}`.toLowerCase();
    const hasFundingLanguage = FUNDING_KEYWORDS.some((keyword) => text.includes(keyword));
    if (hasFundingLanguage) {
      fundingOnlyCount++;
      continue;
    }
    const matchedLabels: string[] = [];
    let articleScore = 0;

    for (const trigger of POSITIVE_TRIGGERS) {
      if (trigger.keywords.some((keyword) => text.includes(keyword))) {
        articleScore += trigger.pts;
        matchedLabels.push(trigger.label);
      }
    }
    for (const trigger of NEGATIVE_TRIGGERS) {
      if (trigger.keywords.some((keyword) => text.includes(keyword))) {
        articleScore += trigger.pts;
        matchedLabels.push(trigger.label);
      }
    }

    const cappedArticleScore = Math.max(-12, Math.min(articleScore, 12));
    if (cappedArticleScore === 0) continue;

    totalScore += cappedArticleScore;
    details.push(...matchedLabels);
    evidence.push({
      label: article.title,
      observed_at: publishedAt.toISOString(),
      source,
      fetched_at: fetchedAt,
      source_url: article.url,
      metadata: {
        trigger_labels: [...new Set(matchedLabels)],
        points: cappedArticleScore,
      },
    });
    if (cappedArticleScore > 0) positiveDates.push(publishedAt);
  }

  const score = Math.max(0, Math.min(totalScore, 20));
  const latestPositiveDate = positiveDates.reduce<Date | null>(
    (latest, date) => (!latest || date > latest ? date : latest),
    null
  );

  return {
    score,
    details: [...new Set(details)],
    evidence,
    observedAt: score > 0 ? latestPositiveDate?.toISOString() ?? null : null,
    duplicateCount,
    fundingOnlyCount,
  };
}

export function buildNewsSignal(
  articles: NewsArticleInput[],
  now: Date,
  fetchedAt: string,
  source: string = SOURCE
): SignalResult {
  const result = scoreNewsArticles(articles, now, fetchedAt, source);

  return {
    score: result.score,
    max: 20,
    detail: result.details.length > 0
      ? result.details.join(", ")
      : "No significant non-funding trigger events detected",
    status: result.score > 0 && result.observedAt ? "ok" : "no_signal",
    observed_at: result.observedAt,
    fetched_at: fetchedAt,
    source,
    evidence: result.evidence,
    metadata: {
      duplicate_articles_ignored: result.duplicateCount,
      funding_only_articles_ignored: result.fundingOnlyCount,
    },
  };
}

export async function fetchNewsSignal(
  company: string,
  signal?: AbortSignal
): Promise<SignalResult> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return {
      score: 0,
      max: 20,
      detail: "News data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: "missing_api_key" },
    };
  }

  try {
    const query = encodeURIComponent(company);
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=10&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 43200 }, signal });
    if (!res.ok) throw new Error(`GNews ${res.status}`);

    const data = (await res.json()) as GNewsResponse;
    return buildNewsSignal(data.articles ?? [], now, fetchedAt, SOURCE);
  } catch (error) {
    return {
      score: 0,
      max: 20,
      detail: "News data unavailable",
      status: "unavailable",
      observed_at: null,
      fetched_at: fetchedAt,
      source: SOURCE,
      evidence: [],
      metadata: { reason: error instanceof Error ? error.message : "unknown_error" },
    };
  }
}
