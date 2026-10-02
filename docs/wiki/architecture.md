# Architecture

VesperWise is a Next.js App Router app. Pages live under route groups. Scoring, billing, and account APIs live under `app/api/`. Shared logic is in `lib/`. Workers are separate processes in `workers/`.

```text
browser / API client
        │
        ▼
proxy.ts  ── Clerk session on private pages and non-public APIs
        │
        ▼
app/api/v1/score/route.ts
        │
        ▼
lib/score-service.ts
        ├── cache + signal_evidence reuse
        ├── parallel signal fetchers in lib/signals/
        ├── lib/scorer.ts
        ├── lib/reasoning.ts
        └── atomic persist + credit debit
```

## Request path

1. `proxy.ts` runs Clerk middleware. `lib/route-access.ts` decides which paths require a session.
2. `POST /api/v1/score` authenticates a Clerk session or a SHA-256-hashed API key and canonicalizes the domain.
3. `scoreCompany` in `lib/score-service.ts` owns cache, evidence, the score run, persistence, and charging.
4. Dashboard pages read stored scores. They do not recompute intent on render.

## Subsystems

| Topic | Page |
|-------|------|
| Score run lifecycle | [Scoring pipeline](scoring-pipeline.md) |
| Weights, freshness, coverage | [Signal weights](signal-weights.md) |
| HTTP contract | [Score API](score-api.md) |
| Pages and API groups | [Routes](routes.md) |
| Module map | [Key modules](key-modules.md) |
| Plans and credits | [Billing](billing.md) |
| Workflows | [Autopilot](autopilot.md) |
| People | [Person scoring](person-scoring.md) |
| CSV and queued jobs | [Bulk scoring](bulk-scoring.md) |
| Careers crawl | [Hiring refresh](hiring-refresh.md) |
| Firecrawl evidence | [Web enrichment](web-enrichment.md) |
| Next model | [Scoring v3](scoring-v3.md) |
| In-product chat | [Chat copilot](chat-copilot.md) |

## Workers

The web process does not crawl. It enqueues a row in `background_jobs` when `BACKGROUND_JOBS_ENABLED=true`. `workers/hiring-refresh` and `workers/web-enrichment` claim those rows with the service role. Both write evidence in shadow mode until an operator promotes a specific adapter or signal.

## Related

- [Database migrations](database-migrations.md)
- [Deployment](deployment.md)
