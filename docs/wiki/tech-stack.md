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

`lib/apollo.ts` can call Apollo People Match when `APOLLO_API_KEY` is set. The person-score path does not use it. See [person scoring](person-scoring.md).

## Local stand-in

`MOCK_SIGNALS=true` makes `lib/signals/mock.ts` return deterministic signals seeded by the domain string. No provider keys are required.

## Related

- [Getting started](getting-started.md)
- [Key modules](key-modules.md)
