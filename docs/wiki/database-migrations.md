# Database migrations

SQL files are in `supabase/migrations/` and applied in filename order:

```bash
supabase db push
```

| Migration | What it adds |
|-----------|----------------|
| `20260305000000_initial_schema` | Base tables |
| `20260306000000_clerk_text_ids` | Clerk text ids on `users` |
| `20260307000000_scores_enrich` | Richer score columns |
| `20260317000000_chat_and_pipeline` | Chat and pipeline |
| `20260322000000_stripe_to_lemonsqueezy` | Billing provider move |
| `20260324000000_business_profile` | Business profile and ICP fit |
| `20260327000000_person_scores` | Person scores |
| `20260329000000_autopilot` | Autopilot workflows |
| `20260407000000_enable_rls_autopilot_person_scores` | RLS on autopilot and person scores |
| `20260408000000_lemonsqueezy_to_polar` | Polar.sh |
| `20260409000000_billing_improvements` | Billing follow-ups |
| `20260411000000_webhook_events_index` | Webhook event index |
| `20260521000000_lists` | Saved lists |
| `20260526000000_inbox_notifications` | Inbox |
| `20260715000000_scoring_v2_pipeline` | Evidence, idempotent runs, coverage, atomic credits |
| `20260727000000_scoring_v3` | V3 shadow results, policies, outcomes |
| `20260821000000_revoke_old_credit_rpcs` | Retire old credit RPCs |
| `20260829000000_onboarding_workspace_name` | Workspace name |
| `20260930000000_replace_redis` | Postgres cache and `background_jobs` |

## Scoring integration test

Run this only against a disposable database. The suite drops that database's `public` schema. The reset confirmation must equal the database name:

```bash
SCORING_V2_TEST_DATABASE_URL=postgres://localhost/scoring_v2_test \
SCORING_V2_TEST_ALLOW_RESET=scoring_v2_test \
npm run test:scoring-db
```

It checks concurrent last-credit reservations, cross-user and cross-profile cache isolation, idempotent replay, persistence-failure refunds, and stale-run recovery against the migration.

The cache and queue suite is `npm run test:cache-queue-db` and has the same class of reset guard (`REPLACE_REDIS_DB_TESTS`).

## Stale-run reaper

Enable the Supabase `pg_cron` module before the production scoring migration. The migration schedules `scoring-v2-stale-run-reaper` every five minutes. It refunds reservations left `running` for more than 15 minutes. If cron is intentionally off, call `reap_stale_score_runs(100)` from a service-role scheduler on that same cadence.

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Getting started](getting-started.md)
