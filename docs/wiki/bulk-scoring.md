# Bulk scoring

Two entry points share per-company caching and the atomic credit rules in `lib/score-service.ts`.

## Dashboard CSV

`POST /api/v1/score/bulk-inline` accepts a multipart file field named `file`. Limit is 50 data rows (`MAX_ROWS`). The CSV needs a `domain` or `company` column. Auth is the Clerk session. The route scores each row inline.

The `/bulk` page uses this path.

## Queued jobs

`POST /api/v1/score/bulk` accepts up to 1,000 companies (`BULK_MAX_PER_JOB` in `lib/plan-features.ts`). A user may have 3 jobs in flight (`BULK_MAX_CONCURRENT`). Free and Starter receive 403. The route stores the company list on the job and scores in batches of 20 inside a 40 second budget (`maxDuration` 60). `GET /api/v1/score/bulk?job_id=` continues a processing job and sweeps stale jobs first. A cache hit is free, a miss debits one credit and writes a ledger row, and the job stops when credits run out. Each company is scored under an idempotency key for that job, and only the worker that holds the job lease may advance it.

A thrown error marks the job `failed` (partial when some companies were scored). Jobs left in `queued` or `processing` with no progress for 15 minutes are marked `failed` on every poll and once a day by `GET /api/cron/sweep-bulk-jobs`, so they stop counting toward the concurrency cap. `webhook_url` must be a public https URL. It is checked when the job is created and again before it is called, and it is called once when the job reaches `completed` or `failed`.

The hiring-refresh and web-enrichment workers do not score bulk jobs.

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Billing](billing.md)
