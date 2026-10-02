# Hiring refresh worker

Process: `workers/hiring-refresh`. Queue helper: `lib/hiring-refresh-queue.ts`.

When Explorium hiring evidence is `unavailable`, `not_found`, or `stale`, and `BACKGROUND_JOBS_ENABLED=true`, the web app enqueues one deduplicated `hiring-refresh` job. The worker crawls the company's HTTPS careers pages and approved Greenhouse, Lever, Ashby, or Workable tenants, then writes `hiring-v2` rows to `signal_evidence`.

Fresh Explorium hiring evidence always wins. Crawled evidence is a fallback, never an addition on top of a fresh provider score.

## Safety defaults

- `SCRAPLING_SHADOW_MODE` defaults to shadow. Shadow rows are stored and excluded from scoring.
- Promotion needs `SCRAPLING_SHADOW_MODE=false` and every adapter in that crawl listed in `SCRAPLING_PROMOTED_ADAPTERS`.
- Allowed adapter names: `company`, `greenhouse`, `lever`, `ashby`, `workable`.
- Mixed adapter results stay shadowed. Promotion is not retroactive.
- `SCRAPLING_BROWSER_ENABLED` defaults off. `SCRAPLING_JOB_TIMEOUT_MS` defaults to 90000.

The worker needs `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a Python environment for Scrapling. It claims jobs from `background_jobs` through service-role RPCs. There is no separate queue service.

Deployment, the promotion bar, and test commands are in [`workers/hiring-refresh/README.md`](../../workers/hiring-refresh/README.md).

## Related

- [Web enrichment](web-enrichment.md)
- [Signal weights](signal-weights.md)
