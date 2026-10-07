import type { SignalResult } from "@/lib/types";

/**
 * News Mentions Signal (max: 15, weight: 15%)
 * Searches for the person's name in recent news using GNews API.
 * Reuses the same GNews pattern as lib/signals/news.ts but for person names.
 */

interface GNewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

const POSITIVE_TRIGGERS: Array<{ pattern: RegExp; points: number; label: string }> = [
  { pattern: /fund(ing|ed|raise)|series [a-e]|capital|invest/i, points: 8, label: "funding" },
  { pattern: /appoint|promot|named|hired|join|new (ceo|cto|cfo|vp|head|director)/i, points: 7, label: "leadership" },
  { pattern: /launch|release|unveil|announce|partner/i, points: 5, label: "launch/partnership" },
  { pattern: /expand|growth|scale|revenue|milestone/i, points: 4, label: "growth" },
];

const NEGATIVE_TRIGGERS: Array<{ pattern: RegExp; points: number }> = [
  { pattern: /layoff|laid off|downsiz|restructur|cut.*(staff|jobs|workforce)/i, points: -5 },
  { pattern: /scandal|fraud|lawsuit|sued|investigation/i, points: -5 },
];

export async function fetchNewsMentionsSignal(
  personName: string,
  companyName: string
): Promise<SignalResult> {
  const MAX = 15;
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return { score: 0, max: MAX, detail: "News data unavailable" };
  }

  try {
    // Search for person name + company for better precision
    const query = `"${personName}" ${companyName}`;
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        return { score: 0, max: MAX, detail: "News API rate limit reached" };
      }
      return { score: 0, max: MAX, detail: `News API error: ${res.status}` };
    }

    const data: GNewsResponse = await res.json();
    if (!data.articles || data.articles.length === 0) {
      return { score: 0, max: MAX, detail: `No recent news mentions for ${personName}` };
    }

    let score = 0;
    const triggers: string[] = [];

    for (const article of data.articles) {
      const text = `${article.title} ${article.description ?? ""}`;

      // Check positive triggers
      for (const trigger of POSITIVE_TRIGGERS) {
        if (trigger.pattern.test(text)) {
          score += trigger.points;
          triggers.push(`${trigger.label}: "${article.title.slice(0, 60)}"`);
          break; // One trigger per article
        }
      }

      // Check negative triggers
      for (const trigger of NEGATIVE_TRIGGERS) {
        if (trigger.pattern.test(text)) {
          score += trigger.points;
          triggers.push(`negative: "${article.title.slice(0, 60)}"`);
          break;
        }
      }
    }

    score = Math.max(0, Math.min(score, MAX));

    return {
      score,
      max: MAX,
      detail: triggers.length > 0
        ? triggers.slice(0, 2).join("; ")
        : `${data.articles.length} article(s) found but no strong triggers for ${personName}`,
    };
  } catch (err) {
    console.error("[news-mentions] error:", err);
    return { score: 0, max: MAX, detail: "Failed to fetch news mentions" };
  }
}
