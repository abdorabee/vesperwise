# Web enrichment worker

This worker consumes Postgres-backed jobs, then maps and extracts dated evidence
from public, company-owned web pages with Firecrawl. It writes
`web-enrichment-v1` rows for hiring, news,
technology, and meaningful web activity to `signal_evidence`. Funding is an
explicit structured-provider fallback, not a default crawl target.

The existing Scrapling hiring worker remains the constrained fallback for
careers pages and approved ATS hosts. Firecrawl and Scrapling rows are selected
as alternative evidence sources and are never added to provider evidence.

## Required environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIRECRAWL_API_KEY`

Optional:

- `WEB_ENRICHMENT_SHADOW_MODE=false` enables the promotion gate. Shadow mode is
  the default.
- `WEB_ENRICHMENT_PROMOTED_SIGNALS=funding,news` approves individual signals.
  The global switch alone cannot promote evidence.
- `WEB_ENRICHMENT_WATCHLIST_INTERVAL_MS=21600000` controls the active-watchlist
  refresh scan; the minimum is one minute and the default is six hours.
- `WEB_ENRICHMENT_DAILY_PAGE_BUDGET=1500` caps requested pages per UTC day.
- `WEB_ENRICHMENT_FUNDING_FALLBACK=true` allows funding pages only when the
  structured source is missing, stale, or unavailable.

## Data and safety boundaries

- Discovery starts at `https://<company-domain>` and accepts only HTTPS pages
  on that domain or its subdomains.
- No cookies, login state, custom headers, browser actions, authentication,
  CAPTCHA handling, paywall bypass, or personal-data extraction are used.
- Query strings and fragments are stripped from discovered URLs.
- Site maps are cached for seven days. Each job is limited to five targeted
  pages, runs at concurrency one, and is
  deduplicated per company for six hours.
- Page content is treated as untrusted data. The extraction prompt explicitly
  ignores instructions in page content, and only exact-entity, dated evidence
  with confidence of at least 0.8 is retained.
- A bounded crawl with no event is stored as `unavailable`, never as
  `no_signal`, so incomplete coverage cannot become zero intent.
- Web activity requires a stored baseline plus a later material content
  change; a first crawl never creates intent.

## Runtime telemetry

Apply `20260727000000_scoring_v3.sql` before starting this worker. The worker
uses `web_enrichment_maps`, `web_page_snapshots`, and `web_enrichment_runs` for
weekly map reuse, privacy-preserving hashed content comparison, budget
enforcement, latency, attempts, page counts, and estimated provider credits.

## Promotion

Keep all signals in shadow mode until at least 100 representative companies
have been reviewed. Promote one signal at a time only after recording at least
98% entity precision, 95% field accuracy, 90% supported-page success, and zero
robots, access-policy, or SSRF violations.

## Run and test

```bash
node workers/web-enrichment/worker.mjs
npx vitest run workers/web-enrichment/*.test.mjs lib/signals/crawled.test.ts lib/web-enrichment-contract.test.ts
```

```bash
docker build -f workers/web-enrichment/Dockerfile -t vesperwise-web-enrichment .
docker run --env-file .env.web-enrichment vesperwise-web-enrichment
```
