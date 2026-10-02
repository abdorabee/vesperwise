# Key modules

| Module | Responsibility |
|--------|----------------|
| `lib/types.ts` | Shared types. `PLAN_CREDITS`, `PLAN_WATCHLIST_LIMIT`, `PLAN_RATE_LIMIT`. |
| `lib/plan-features.ts` | Prices, top-up packs, and marketing feature lines derived from those limits. |
| `lib/supabase.ts` | `createSupabaseAdmin()` only. Service role, no persisted session. |
| `lib/user-provisioning.ts` | `ensureUserRecord` upserts the `users` row for a Clerk id. Callers must handle `{ ok: false }`. |
| `lib/cache.ts` | Postgres-backed cache. Every operation no-ops when `CACHE_DISABLED=true`. |
| `lib/score-service.ts` | Domain canonicalization, evidence reuse, cache, idempotent runs, persistence, charging. |
| `lib/score-evidence.ts` | Choose one evidence row per trigger. Fresh beats stale. Sources are not summed. |
| `lib/scorer.ts` | V2 linear model, v3 policy, freshness, coverage, bands. |
| `lib/reasoning.ts` | One bounded OpenRouter request, Zod-validated. Deterministic fallback. |
| `lib/signals/mock.ts` | Deterministic signals seeded by domain when `MOCK_SIGNALS=true`. |
| `lib/signals/*` | Explorium funding and hiring, GNews, BuiltWith, Open PageRank, GitHub. |
| `lib/hiring-refresh-queue.ts` | Enqueue a deduped careers crawl. |
| `lib/web-enrichment-queue.ts` | Enqueue a deduped Firecrawl job. |
| `lib/route-access.ts` | Which paths `proxy.ts` protects. |
| `proxy.ts` | Next.js 16 middleware. The export is named `proxy`, not `middleware`. |
| `lib/api-keys.ts` | `vesperwise_` key prefix and hash helpers. |
| `lib/pdl.ts` | Person profile built from the submitted name, email, or LinkedIn URL. No outbound enrichment call. |
| `lib/apollo.ts` | Optional Apollo People Match client. Not used by the person-score service. |

Signal fetchers return a `SignalResult` with `score`, `max`, `status`, `observed_at`, `source`, and `evidence`. The scorer never reads provider payloads directly.

## Related

- [Architecture](architecture.md)
- [Tech stack](tech-stack.md)
