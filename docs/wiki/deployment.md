# Deployment

The app deploys to Vercel. Set every variable from the [README environment template](../../README.md#2-configure-environment) in the Vercel project. Do not rely on `.env.local` in production.

## Required for a real score

- Supabase URL, anon key, and service role key
- Clerk publishable and secret keys
- Polar access token, webhook secret, and product ids for each plan and top-up
- Provider keys for any signal you do not want mocked
- `MOCK_SIGNALS=false` once those keys exist
- `SCORING_V2_ENABLED=true`

`OPENROUTER_API_KEY` should be set in production so reasoning is model-generated. Without it the API still returns a score and a deterministic write-up.

## Polar

Register `https://<your-domain>/api/billing/webhook` in the Polar dashboard and use the same signing secret as `POLAR_WEBHOOK_SECRET`. Checkout will not update plans if this endpoint rejects signatures.

## Workers

Run the Next.js app and the workers as separate processes. Set `BACKGROUND_JOBS_ENABLED=true` only on deployments that have a worker consuming `background_jobs`.

Keep `SCRAPLING_SHADOW_MODE` and `WEB_ENRICHMENT_SHADOW_MODE` on until an adapter or signal has been reviewed. Promotion flags are per worker. See [hiring refresh](hiring-refresh.md) and [web enrichment](web-enrichment.md).

Leave `SCORING_V3_ENABLED` and `SCORING_V3_SHADOW_ENABLED` off until you intend to compare or serve v3.

## Cron

The scoring migration expects `pg_cron` so stale score runs are refunded. See [database migrations](database-migrations.md).

## Related

- [Getting started](getting-started.md)
- [Billing](billing.md)
