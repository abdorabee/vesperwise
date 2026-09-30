# Hiring refresh worker

This worker consumes deduplicated Postgres-backed `hiring-refresh` jobs, runs the pinned
Scrapling crawler, and stores `hiring-v2` evidence in `signal_evidence`. It is a
fallback for hiring coverage, not a second signal to add on top of Explorium.

The web app enqueues a refresh when primary Explorium hiring evidence is
`unavailable`, `not_found`, or `stale`. Fresh Explorium evidence always wins.

## Environment

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `SCRAPLING_SHADOW_MODE=false` — enable the promotion gate. Shadow mode is the
  default and should remain enabled while adapters are being evaluated.
- `SCRAPLING_PROMOTED_ADAPTERS=greenhouse,lever` — explicit per-adapter
  allowlist. Valid values are `company`, `greenhouse`, `lever`, `ashby`, and
  `workable`. The global switch alone never promotes evidence.
- `SCRAPLING_BROWSER_ENABLED=true` to permit non-stealth Playwright fallback.
- `SCRAPLING_JOB_TIMEOUT_MS` (default `90000`)
- `PYTHON_BIN` (default `python3`)

The web app only enqueues when it runs with `BACKGROUND_JOBS_ENABLED=true`.
Jobs are claimed from the Supabase `background_jobs` table through service-role
RPCs. No separate queue service is required.

## Promotion behavior

- Shadow rows (`shadow=true`) are persisted for evaluation but excluded from
  scoring.
- Promotion requires both `SCRAPLING_SHADOW_MODE=false` and every adapter in a
  crawl result to appear in `SCRAPLING_PROMOTED_ADAPTERS`. Mixed observations
  remain shadowed; promotion never applies retroactively.
- Approve adapters one at a time only after reviewing at least 100
  representative domains and recording ≥98% entity precision, ≥95% field
  accuracy, ≥90% supported-page success, and zero robots/SSRF violations.
- Promoted evidence is considered only when Explorium is unavailable, not
  found, or stale. The two sources are never combined.
- Active job postings are normalized by the shared hiring scorer. Only valid,
  recent posting dates contribute to freshness or score; undated listings stay
  as context. Evidence is retained for up to 7 days as last-known-good data.

## Run locally

Install the JavaScript and pinned Python dependencies, then start the worker:

```bash
npm install
python3 -m pip install -r workers/hiring-refresh/requirements.txt
scrapling install
node workers/hiring-refresh/worker.mjs
```

The production image packages both runtimes:

```bash
docker build -f workers/hiring-refresh/Dockerfile -t vesperwise-hiring-refresh .
docker run --env-file .env.hiring vesperwise-hiring-refresh
```

## Tests

```bash
npm test -- lib/hiring-refresh-queue.test.ts lib/signals/hiring.test.ts
python3 -m unittest workers/hiring-refresh/test_crawl.py
```

## Crawl boundaries

The crawler only follows HTTPS links from the company domain to same-domain
careers pages or approved Greenhouse, Lever, Ashby, and Workable tenants. It
honors `robots.txt`, rejects private/non-public network targets, and applies a
request delay and page cap. The worker is fixed at one job at a time; deploy a
single replica to preserve that host-level concurrency guarantee. It does not use proxies, stealth fetchers, CAPTCHA
bypass, or LinkedIn.

Run the production container with a read-only root filesystem, a writable
`/tmp`, all Linux capabilities dropped, `no-new-privileges`, and outbound
network policy that denies private, loopback, link-local, and cloud metadata
ranges. The crawler pins validated public DNS answers for static and browser
fetches, runs as a non-root user, and does not inherit the worker's Supabase or
queue or unrelated application credentials.
