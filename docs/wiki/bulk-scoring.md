# Bulk scoring

Two entry points share per-company caching and the atomic credit rules in `lib/score-service.ts`.

## Dashboard CSV

`POST /api/v1/score/bulk-inline` accepts a multipart file field named `file`. Limit is 50 data rows (`MAX_ROWS`). The CSV needs a `domain` or `company` column. Auth is the Clerk session. The route scores each row inline.

The `/bulk` page uses this path.

## Queued jobs

`POST /api/v1/score/bulk` accepts up to 1,000 companies (`BULK_MAX_PER_JOB` in `lib/plan-features.ts`). A user may have 3 jobs in flight (`BULK_MAX_CONCURRENT`). The route checks `credits_remaining` against the company count, then inserts a `bulk_jobs` row with status `queued`. It does not decrement credits. The processor hand-off is still a TODO in `app/api/v1/score/bulk/route.ts`.

Queued jobs stay queued. The hiring-refresh and web-enrichment workers do not score bulk jobs.

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Billing](billing.md)
