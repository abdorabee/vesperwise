# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Do not invent a different stack.** Auth is Clerk, AI is OpenRouter, brand lime is `#DFFF00`. README is the source of truth if this file drifts.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Vitest, one run
```

## Environment Variables

Create a `.env.local` file with:

```
# Supabase (Postgres + RLS only — not auth)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# OpenRouter (score reasoning + chat copilot; deterministic fallback if unset)
OPENROUTER_API_KEY=

# Upstash Redis (optional — cache is skipped if not set)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Polar.sh (payment gateway)
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
APIFY_API_KEY=
GITHUB_TOKEN=

# Resend (contact form — logs to console if unset)
RESEND_API_KEY=

# Dev mode — use mock signals instead of real API calls
MOCK_SIGNALS=true
```

Set `MOCK_SIGNALS=true` to skip all external signal API calls during development.

## Architecture Overview

**VesperWise** is a B2B sales intelligence platform that scores companies by purchase intent. It is a Next.js 16 App Router application.

### Core Scoring Pipeline (`app/api/v1/score/route.ts`)

1. Authenticate the Clerk session or SHA-256-hashed API key and canonicalize the company domain
2. Check user credits in `users` table
3. Check Redis cache (personalized; skipped if Upstash is unset)
4. Fetch signals in parallel (funding, hiring, news, technology, plus web/GitHub context)
5. Compute weighted intent score 0–100 via `lib/scorer.ts`
6. Generate AI summary + recommended action via `lib/reasoning.ts` (OpenRouter)
7. Persist to `scores` / score runs and deduct 1 credit

### Signal Weights (`lib/scorer.ts`)

Active engine is `v2-linear-2026-07`. Four scored triggers only — **web and GitHub carry zero score weight** and are context for the AI summary:

| Signal     | Base weight | Role           |
|------------|------------:|----------------|
| funding    | 22          | Scored trigger |
| hiring     | 19          | Scored trigger |
| news       | 18          | Scored trigger |
| technology | 18          | Scored trigger |
| web        | —           | Context only   |
| github     | —           | Context only   |

Trigger weights total 77. Each signal decays from **its own** `observed_at`, not a shared
`latestSignalDate`: `freshness = 0.85 ^ (age_days / 30)`. A positive score with no `observed_at` is
forcibly downgraded to `unavailable` so undated evidence cannot inflate a score.

`coverage = Σ(base_weight × status_factor) / 77`, where the factor is 1 for `ok`/verified
`no_signal`, 0.5 for `stale`, and 0 for `not_found`/`unavailable`. Coverage of exactly 1.0 is
`complete`, ≥0.6 is `partial`, below 0.6 is `unscorable` — null score, no credit charged.

Bands: HOT ≥75, WARM ≥50, COLD <50. See README.md for the full pipeline.

### Key Libraries

- `lib/types.ts` — all shared types and plan constants (`PLAN_CREDITS`, `PLAN_WATCHLIST_LIMIT`, `PLAN_RATE_LIMIT`)
- `lib/supabase.ts` — `createSupabaseAdmin()` (service role, bypasses RLS). There is no cookie Supabase auth client; identity is Clerk.
- `lib/user-provisioning.ts` — creates the `users` row for a Clerk id; callers must handle `{ ok: false }`
- `lib/redis.ts` — Upstash Redis wrapper; all cache operations are no-ops if `UPSTASH_REDIS_REST_URL` is not set
- `lib/reasoning.ts` — OpenRouter wrapper; falls back to a mock summary if `OPENROUTER_API_KEY` is not set
- `lib/signals/mock.ts` — deterministic mock signals seeded by domain string (used when `MOCK_SIGNALS=true`)

### Route Groups

- `app/(auth)/` — login, signup pages (unauthenticated layout)
- `app/(dashboard)/` — dashboard, score, watchlist, bulk, api-keys, billing pages (authenticated layout)
- `app/api/v1/` — public REST API (score single, bulk score, watchlist, prioritize)
- `app/api/billing/` — Polar.sh checkout, top-up, and webhook handler
- `app/api/user/` — API key and profile management

### Auth & Middleware

`proxy.ts` exports the middleware function (named `proxy`, not `middleware`) that runs `clerkMiddleware` and redirects unauthenticated users away from dashboard paths. `/onboarding` is public only when `VERCEL_ENV !== "production"`.

User identity is a Clerk `user_*` text id stored on `public.users.id`. `ensureUserRecord` upserts that row. Profile `PUT` must update an existing row; a 0-row update is a 404, not success.

Signed-in browser tests: `TEST_LOGIN_*` may hit Clerk MFA. Prefer a new signup on `/signup` (custom form, not `accounts.dev`). Open a temp inbox (`https://temp-mail.org` or `https://www.guerrillamail.com`), copy the address that appears, submit signup, then read the 6-digit Clerk code from the inbox below. Submit verify once and wait for `/dashboard`. Do not open `/onboarding` while signed out — outside production it is a read-only preview (`preview@example.com`).

### Brand

Lime accent is `#DFFF00` (`--accent` / `--iq-accent`). Hover is `#E8FF40`. Do not use `#D4FF3D`.

### Billing Model

Plans: `free | starter | growth | pro | agency`. Credits are reset on subscription change (via Polar webhook `subscription.created`/`subscription.updated`). One-time top-ups increment credits without changing plan (via `order.paid` webhook). Credits are deducted per score request. Bulk jobs deduct credits equal to the company count upfront.

### Bulk Jobs

`app/api/v1/score/bulk/route.ts` creates a `bulk_jobs` row with status `queued`. The actual BullMQ worker processing is not yet wired up (marked as TODO). Max 1,000 companies per job, max 3 concurrent jobs per user.

### UI Components

`components/ui/` — shadcn/ui components. `components/dashboard/` — dashboard nav and quick-score widget. `components/landing/` — marketing landing page.
