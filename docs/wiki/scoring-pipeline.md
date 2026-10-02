# Scoring pipeline

Entry point: `app/api/v1/score/route.ts`. Orchestration: `scoreCompany` in `lib/score-service.ts`.

## Steps

1. Authenticate the Clerk session or the SHA-256 hash of an API key. Canonicalize the company domain.
2. Look up the personalized cache. The key is isolated by workspace, domain, business-profile hash, and scoring version. A hit is free and lasts 6 hours (`SCORE_EVIDENCE_TTL_SECONDS` in `lib/cache.ts`). `CACHE_DISABLED=true` skips this.
3. Start an idempotent score run and reserve one credit. Concurrent duplicates of the same request share the run.
4. Reuse source evidence that is still inside the 6-hour window. Otherwise refresh sources in parallel. Last-known-good evidence is kept for up to 7 days and marked `stale` when a refresh fails.
5. Score the four intent triggers in `lib/scorer.ts` and compute coverage. Web and GitHub stay context-only on v2.
6. Reject runs below the coverage minimum. Scoreable runs get AI reasoning and, when the workspace has a verified profile, a separate ICP-fit score.
7. Persist evidence, score history, and the replayable result, and debit the reserved credit in one transaction. Failed and unscorable runs return the credit.
8. Cache the personalized result for 6 hours. Eligible automations run only after persistence succeeds.

## Credit rules

- One company score reserves one credit up front.
- Cache hits do not charge.
- `unscorable`, failed, and persistence-failure runs refund the reservation.
- A run left `running` for more than 15 minutes is refunded by `reap_stale_score_runs`. Production installs that as the `scoring-v2-stale-run-reaper` cron every five minutes.

## Idempotency

Clients that might retry send `Idempotency-Key`. The same key and the same input replay the terminal result. The same key with different input is rejected.

## Related

- [Signal weights](signal-weights.md)
- [Score API](score-api.md)
- [Database migrations](database-migrations.md)
