# VesperWise

B2B sales intelligence platform that scores companies by purchase intent using time-bound evidence and AI reasoning.

## What it does

VesperWise scores four purchase-intent triggers—funding, hiring, news, and technology changes—and keeps web authority and GitHub activity as supporting context. The versioned scoring model returns a 0–100 score, source coverage, freshness-adjusted contributions, and an AI-generated buying-stage analysis. A separate `icp_fit_score` measures fit against a verified workspace business profile without changing purchase intent.

Score bands: **HOT** (≥75) · **WARM** (50–74) · **COLD** (<50)

## Tech stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL + RLS)
- **Cache**: Upstash Redis
- **Billing**: Polar.sh
- **AI**: OpenRouter (Gemini score reasoning; Claude chat copilot and onboarding)
- **Signal APIs**: Explorium (funding and hiring), GNews, BuiltWith, OpenPageRank, GitHub
- **Hiring fallback**: BullMQ + Scrapling crawler for promoted first-party careers evidence
- **UI**: Tailwind CSS 4, shadcn/ui

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# OpenRouter (bounded score reasoning; deterministic fallback if unset)
OPENROUTER_API_KEY=

# Upstash Redis (cache skipped if unset)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Polar.sh billing
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRODUCT_STARTER=
POLAR_PRODUCT_GROWTH=
POLAR_PRODUCT_PRO=
POLAR_PRODUCT_AGENCY=
POLAR_PRODUCT_TOPUP_100=
POLAR_PRODUCT_TOPUP_500=
POLAR_PRODUCT_TOPUP_1000=

# Signal sources (only needed when MOCK_SIGNALS=false)
EXPLORIUM_API_KEY=
GNEWS_API_KEY=
BUILTWITH_API_KEY=
OPEN_PAGE_RANK_API_KEY=
GITHUB_TOKEN=

# Skip real API calls during development
MOCK_SIGNALS=true

# Core scoring rollout (default true). Set false for the saturated four-trigger rollback engine.
SCORING_V2_ENABLED=true
# V3 remains opt-in and automation-disabled. Shadow comparison stores v3 beside active v2.
SCORING_V3_ENABLED=false
SCORING_V3_SHADOW_ENABLED=false

# Optional hiring refresh worker; requires a Redis TCP/TLS URL, not Upstash REST
BULLMQ_REDIS_URL=
SCRAPLING_SHADOW_MODE=true
SCRAPLING_PROMOTED_ADAPTERS=
SCRAPLING_BROWSER_ENABLED=false
SCRAPLING_JOB_TIMEOUT_MS=90000
# PYTHON_BIN=python3

# Fresh public-web evidence worker (Firecrawl; shadow mode by default)
FIRECRAWL_API_KEY=
WEB_ENRICHMENT_SHADOW_MODE=true
WEB_ENRICHMENT_PROMOTED_SIGNALS=
WEB_ENRICHMENT_WATCHLIST_INTERVAL_MS=21600000
WEB_ENRICHMENT_DAILY_PAGE_BUDGET=1500
# Crawl funding only when the structured provider is missing/stale.
WEB_ENRICHMENT_FUNDING_FALLBACK=false
```

Set `MOCK_SIGNALS=true` to use deterministic mock signals seeded by domain — no external API keys required for local dev.

### 3. Run

```bash
npm run dev      # localhost:3000
npm run build    # production build
npm run lint     # ESLint
npm test         # Vitest, one run
npm run test:scoring-db # destructive only to an explicitly confirmed disposable Postgres database
npm run test:watch
```

## Architecture

### Scoring pipeline (`app/api/v1/score/route.ts`)

1. Authenticate the Clerk session or SHA-256-hashed API key and canonicalize the company domain.
2. Check the personalized result cache, isolated by workspace, domain, business-profile hash, and scoring version. Successful results live for 6 hours and cache hits are free.
3. Start an idempotent database-backed score run and reserve one credit. Concurrent duplicates share the same run.
4. Reuse fresh source evidence for 6 hours, otherwise refresh sources in parallel. Last-known-good evidence is retained for up to 7 days and marked stale when a refresh fails.
5. Score the four intent triggers and calculate explicit data coverage; web and GitHub remain context-only.
6. Reject results below minimum coverage, or generate AI reasoning and a separate ICP-fit score for scoreable results.
7. Atomically persist the evidence, score history, replayable result, and one credit debit. Failed and unscorable runs return the reserved credit.
8. Cache the personalized result for 6 hours and run eligible automations after persistence succeeds.

### Signal weights

| Source | Base weight | Composite role |
|--------|------------:|----------------|
| Funding | 22 | Scored trigger |
| Hiring | 19 | Scored trigger |
| News | 18 | Scored trigger |
| Technology | 18 | Scored trigger |
| Web | — | Context only |
| GitHub | — | Context only |

The four trigger weights total 77. Each source score is normalized to 0–100, then decayed from its own verified `observed_at` timestamp:

```text
normalized_i = 100 × clamp(source_score_i / source_max_i, 0, 1)
freshness_i  = 0.85 ^ (max(age_days_i, 0) / 30)
coverage     = Σ(base_weight_i × status_factor_i) / 77
intent_score = round(Σ(effective_weight_i × normalized_i × freshness_i)
                     / Σ(effective_weight_i))
```

Coverage factors are `1` for `ok` and verified `no_signal`, `0.5` for `stale`, and `0` for `not_found` or `unavailable`. The effective weight is the base weight multiplied by that factor. Verified `no_signal` contributes zero score with full coverage.

| Coverage | `score_status` | Result |
|----------|----------------|--------|
| `1.0` | `complete` | Full score; eligible for automation after the baseline run |
| `0.6` to `<1.0` | `partial` | Score returned with reduced source coverage |
| `<0.6` | `unscorable` | Null score and band; no credit charged |

There is no sigmoid or cross-signal boost. The freshness curve retains 85% of a trigger after 30 days, and the response exposes the calculation in `contributions`. Score bands remain **HOT** (≥75), **WARM** (50–74), and **COLD** (<50).

### Score API

`POST /api/v1/score` is the canonical interface. Supply a domain and optionally the display name; use `Idempotency-Key` when a client may retry the same request.

```bash
curl -X POST http://localhost:3000/api/v1/score \
  -H "Authorization: Bearer $VESPERWISE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: score-acme-2026-07-15" \
  -d '{"domain":"acme.com","company":"Acme"}'
```

`GET /api/v1/score?domain=acme.com&company=Acme` remains available as a compatibility wrapper. New integrations should use `POST`. Reusing an idempotency key with the same request replays its terminal result; reusing it for different input is rejected.

Important response fields include `scoring_version`, `scoring_policy_id`, `score_status`, `data_coverage`, `signal_coverage`, `contributions`, `source_status`, `cached`, and `charged`. Each contribution records raw strength, recency, effective weight, score points, source, confidence, reason codes, and evidence URLs. `icp_fit_score` is returned separately when the workspace has a verified business profile; it is never blended into `intent_score`.

### Route groups

| Group | Path | Purpose |
|-------|------|---------|
| `(auth)` | `/login`, `/signup` | Unauthenticated layout |
| `(dashboard)` | `/score`, `/people`, `/bulk`, `/watchlist`, `/pipeline`, `/history`, `/autopilot`, `/settings`, `/billing`, `/api-keys` | Authenticated layout |
| `api/v1/` | `/score`, `/score/bulk`, `/score/person`, `/watchlist`, `/prioritize` | Public REST API |
| `api/billing/` | `/checkout`, `/topup`, `/webhook` | Polar.sh integration |
| `api/user/` | `/api-keys`, `/profile`, `/account`, `/scoring-policy` | Account and API key management |

### Key modules

- `lib/types.ts` — shared types, `PLAN_CREDITS`, `PLAN_WATCHLIST_LIMIT`, `PLAN_RATE_LIMIT`
- `lib/supabase.ts` — `createSupabaseAdmin()` (service role, bypasses RLS). There is no cookie-based Supabase auth client; identity is Clerk.
- `lib/redis.ts` — Upstash wrapper; no-ops if env vars not set
- `lib/score-service.ts` — evidence reuse, personalized caching, idempotent runs, persistence, and charging
- `lib/scorer.ts` — versioned linear intent model, freshness, coverage, and bands
- `lib/reasoning.ts` — one bounded, schema-validated OpenRouter request with a deterministic fallback
- `lib/signals/mock.ts` — deterministic mock signals for dev
- `lib/hiring-refresh-queue.ts` — best-effort BullMQ producer for first-party hiring refreshes
- `proxy.ts` — Next.js 16 middleware (named export `proxy`); refreshes Clerk session, redirects unauthenticated users from dashboard paths

### Billing

Plans: `free` · `starter` · `growth` · `pro` · `agency`

Credits reset on subscription change (Polar webhook `subscription.created` / `subscription.updated`). One-time top-ups increment credits without changing plan (`order.paid`). Bulk jobs deduct credits equal to the company count upfront.

| Plan    | Credits/mo |
|---------|-----------|
| Free    | 20        |
| Starter | 500       |
| Growth  | 2,500     |
| Pro     | 8,000     |
| Agency  | 25,000    |

### Autopilot

Workflow engine with conditional triggers (score thresholds, band changes, signal spikes) and actions (email drafts, webhooks, Slack notifications, pipeline stage updates). Supports AND/OR condition logic, daily/weekly schedules, and full run history.

### Person scoring (`/people`)

Scores individuals by email, LinkedIn URL, or name. Signals: career trajectory (30 pts), seniority fit (20 pts), company intent (20 pts), news mentions (15 pts), social presence (15 pts).

**Status: beta, and thinner than it looks.** `lib/pdl.ts` builds the person record from the details the caller supplies — it makes no external enrichment call. The real Apollo.io client in `lib/apollo.ts` is not wired into the scoring path, so `career_change` scores an empty employment history and `social_presence` measures field completeness. Only `news_mentions` hits a live provider (GNews). Treat the composite as indicative until enrichment is connected.

### Bulk scoring

The dashboard CSV flow scores up to 50 companies inline and relies on the same per-company cache and atomic charging behavior. The public queued bulk endpoint (`POST /api/v1/score/bulk`) is **not implemented**: it records a `queued` `bulk_jobs` row, discards the submitted company list, and no worker consumes the queue. It is undocumented on the public API docs page for that reason. Use the inline CSV flow until a processor exists. The hiring-refresh worker below does not process bulk scoring jobs.

### Hiring refresh worker (Scrapling Phase 2)

When Explorium hiring evidence is `unavailable`, `not_found`, or `stale`, the web app can enqueue a deduplicated `hiring-refresh` job. The worker crawls only the company's HTTPS careers pages and approved Greenhouse, Lever, Ashby, or Workable tenants, then stores `hiring-v2` evidence in `signal_evidence`.

Scrapling evidence is written in shadow mode by default. Only evidence deliberately promoted with `shadow=false` can affect scoring, and it is used as a fallback—never added to fresh Explorium hiring evidence. See [`workers/hiring-refresh/README.md`](workers/hiring-refresh/README.md) for deployment, safety constraints, and test commands.

The worker requires `BULLMQ_REDIS_URL` with a Redis TCP/TLS connection. `UPSTASH_REDIS_REST_URL` is used by the web app cache and is not BullMQ-compatible.

### Fresh web enrichment worker (Firecrawl)

Every company score best-effort enqueues a deduplicated `web-enrichment` job.
The Firecrawl worker extracts dated hiring, company-announcement, and
technology-change evidence and maintains first-party page snapshots for
meaningful web-activity changes. Funding is excluded by default and is crawled
only when `WEB_ENRICHMENT_FUNDING_FALLBACK=true` and the structured source is
missing or stale. Scrapling remains a separate careers/ATS fallback worker.

Site maps are cached for seven days, each account scrape is capped at five
targeted pages, and a daily page budget stops new work before the configured
limit. `web_enrichment_runs` records latency, attempts, pages, and estimated
provider credits. The first snapshot creates a baseline and never creates
intent; only a later material content delta can produce `web_activity`.

New evidence is shadow-only by default. Promoted rows compete with provider
evidence through freshness, positive-event, entity-match, and confidence
selection; only one source is used for each trigger, so observations are never
double-counted. A crawl that finds no verified dated event is `unavailable`,
not zero intent. See
[`workers/web-enrichment/README.md`](workers/web-enrichment/README.md) for
deployment, promotion, and safety constraints.

### Scoring v3 rollout and outcomes

V3 uses funding 25%, hiring 25%, news 20%, technology change 20%, and meaningful
web activity 10%, with per-signal half-lives of 180, 45, 30, 90, and 14 days.
It requires four signal-equivalents and 75% weighted coverage. Keep v2 active
and set `SCORING_V3_SHADOW_ENABLED=true` to persist comparable v3 results in
`score_shadow_results`. `SCORING_V3_ENABLED=true` makes v3 user-facing, but v3
automation remains database-disabled until a separate promotion migration.

Custom organization, ICP, or vertical policies can be managed through
`/api/user/scoring-policy`. Pipeline users can attach `closed_won`,
`closed_lost`, `no_decision`, or `disqualified` to the exact score snapshot;
these labels are stored in `score_outcomes`.

### Chat copilot

Real-time chat with embedded score cards. Claude is routed through OpenRouter. Conversation history is persisted to `chat_sessions` / `chat_messages`. Chats cost 0.25 credits per message.

## Database migrations

Located in `supabase/migrations/`. Run via Supabase CLI:

```bash
supabase db push
```

Before deploying scoring v2, apply the migration to a disposable Postgres
database and exercise the real transactional RPCs. The integration suite
refuses ordinary database names and requires the reset confirmation to exactly
match the disposable database name:

```bash
SCORING_V2_TEST_DATABASE_URL=postgres://localhost/scoring_v2_test \
SCORING_V2_TEST_ALLOW_RESET=scoring_v2_test \
npm run test:scoring-db
```

The suite resets that database's `public` schema, then verifies concurrent
last-credit reservations, cross-user/profile cache isolation, idempotent replay,
persistence-failure refunds, and stale-run recovery against the migration itself.

Enable the Supabase Cron Postgres module before applying the production
migration. The migration then installs the named `scoring-v2-stale-run-reaper`
job every five minutes; it refunds reservations left `running` for more than 15
minutes. If Cron is intentionally disabled, invoke
`reap_stale_score_runs(100)` from a service-role scheduler at the same cadence.

Notable migrations:
- Auth migration to Clerk
- Business profile + ICP fit scoring
- Scoring v2 evidence, idempotent score runs, coverage metadata, and atomic credit lifecycle
- Person scoring
- Autopilot workflows
- Polar.sh billing
- RLS hardening on autopilot and person_scores tables

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel dashboard. The Polar webhook endpoint (`/api/billing/webhook`) must be registered in the Polar dashboard with the correct signing secret.
