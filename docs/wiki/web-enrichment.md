# Web enrichment worker

Process: `workers/web-enrichment`. Queue helper: `lib/web-enrichment-queue.ts`. Schema version: `web-enrichment-v1`.

Every company score best-effort enqueues a deduplicated `web-enrichment` job when background jobs are enabled. Firecrawl extracts dated hiring, company-announcement, and technology-change evidence, and keeps first-party page snapshots so a later crawl can see a real content change.

Funding pages are off unless `WEB_ENRICHMENT_FUNDING_FALLBACK=true` and the structured funding source is missing or stale. Scrapling remains the careers and ATS fallback. The two crawlers are alternative sources. `lib/score-evidence.ts` picks one row per trigger.

## Limits

- Discovery starts at `https://<company-domain>` and stays on that host and its subdomains.
- No cookies, login, custom headers, browser actions, or personal-data extraction.
- Sitemaps are cached for seven days.
- Each account scrape is capped at five pages.
- `WEB_ENRICHMENT_DAILY_PAGE_BUDGET` defaults to 1500 pages per UTC day.
- `WEB_ENRICHMENT_WATCHLIST_INTERVAL_MS` defaults to 6 hours.
- `web_enrichment_runs` records latency, attempts, pages, and estimated provider credits.

The first snapshot is a baseline and creates no intent. Only a later material delta can produce `web_activity`. A crawl with no verified dated event is `unavailable`, not a zero-intent score.

## Promotion

New rows are shadow-only until `WEB_ENRICHMENT_SHADOW_MODE=false` and the signal is listed in `WEB_ENRICHMENT_PROMOTED_SIGNALS`. Promoted rows compete with provider rows on freshness, positive event, entity match, and confidence. One source is used per trigger.

Details: [`workers/web-enrichment/README.md`](../../workers/web-enrichment/README.md).

## Related

- [Hiring refresh](hiring-refresh.md)
- [Scoring v3](scoring-v3.md)
