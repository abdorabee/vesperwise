# Tech stack

| Layer | Choice | Where it shows up |
|-------|--------|-------------------|
| App | Next.js 16.1 App Router, React 19 | `app/` |
| Auth | Clerk | `proxy.ts`, `@clerk/nextjs` |
| Database | Supabase Postgres with RLS | `supabase/migrations/`, `lib/supabase.ts` |
| Cache and jobs | Supabase Postgres | `lib/cache.ts`, `background_jobs` |
| Billing | Polar.sh | `app/api/billing/` |
| Score reasoning | OpenRouter, Gemini flash models | `lib/reasoning.ts` |
| Chat copilot | OpenRouter, Claude Sonnet by default | `app/api/chat/route.ts` |
| Contact mail | Resend, console log if unset | `app/api/contact/route.ts` |
| UI | Tailwind CSS 4, shadcn/ui, Radix, Lucide, Streamdown | `components/`, `app/globals.css` |

Identity is a Clerk `user_*` id on `public.users.id`. `lib/supabase.ts` exposes only `createSupabaseAdmin()` (service role, bypasses RLS). There is no cookie-based Supabase auth client.

## Signal providers

Used when `MOCK_SIGNALS` is not `true`:

| Signal | Provider | Env |
|--------|----------|-----|
| Funding, hiring | Explorium | `EXPLORIUM_API_KEY` |
| News | GNews | `GNEWS_API_KEY` |
| Technology | BuiltWith | `BUILTWITH_API_KEY` |
| Web authority | Open PageRank | `OPEN_PAGE_RANK_API_KEY` |
| GitHub context | GitHub | `GITHUB_TOKEN` |
| Hiring fallback | Scrapling worker | see [hiring refresh](hiring-refresh.md) |
| Public-web evidence | Firecrawl worker | `FIRECRAWL_API_KEY` |
| Funding, hiring, news, technology, firmographics fallback | treg (Aviato, PredictLeads, Akta, Hunter) | `TREG_TOKEN` |

### treg fallback

`lib/treg.ts` calls `https://treg.to/call/<endpoint_id>` with one `TREG_TOKEN`; treg injects the provider key and bills per call. The fallback runs when the primary provider returns `unavailable` or `not_found`. Hiring also falls back on a primary `no_signal`: on 26 watchlist domains Explorium found no hiring events on any of them, while PredictLeads found active postings on 16.

Evidence is stored in `signal_evidence` under `treg-*` source ids. Rows are shadowed (`shadow=true`, excluded from scoring) unless `TREG_FALLBACK_SHADOW_MODE=false` and the signal is listed in `TREG_PROMOTED_SIGNALS`. A fresh treg row, shadowed or not, suppresses a repeat call for the same domain and signal.

`lib/apollo.ts` can call Apollo People Match when `APOLLO_API_KEY` is set. The person-score path does not use it. See [person scoring](person-scoring.md).

## Local stand-in

`MOCK_SIGNALS=true` makes `lib/signals/mock.ts` return deterministic signals seeded by the domain string. No provider keys are required.

## Related

- [Getting started](getting-started.md)
- [Key modules](key-modules.md)
