# Score API

Canonical call: `POST /api/v1/score`.

```bash
curl -X POST http://localhost:3000/api/v1/score \
  -H "Authorization: Bearer $VESPERWISE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: score-acme-2026-07-15" \
  -d '{"domain":"acme.com","company":"Acme"}'
```

`domain` is required. `company` is the display name. Send `Idempotency-Key` when the client may retry.

`GET /api/v1/score?domain=acme.com&company=Acme` is a compatibility wrapper. New integrations use `POST`.

Browser sessions authenticate with Clerk. API clients send `Authorization: Bearer` with a key created under `/api-keys`. Keys are stored as SHA-256 hashes and use the `vesperwise_` prefix (`lib/api-keys.ts`).

## Fields that matter

| Field | Meaning |
|-------|---------|
| `scoring_version` | Active model id, normally `v2-linear-2026-07` |
| `scoring_policy_id` | Policy used for this run |
| `score_status` | `complete`, `partial`, or `unscorable` |
| `intent_score` / `score_band` | Null when unscorable |
| `data_coverage` | Weighted coverage, 0–1 |
| `signal_coverage` | Signal-equivalent coverage used by v3 comparisons |
| `contributions` | Raw strength, recency, effective weight, points, source, confidence, reason codes, evidence URLs |
| `source_status` | Per-source status |
| `icp_fit_score` | Present only with a verified business profile. Not part of `intent_score`. |
| `cached` | True when the personalized cache answered |
| `charged` | Whether this response debited a credit |

Reusing an idempotency key with the same body replays the terminal result. Reusing it for different input is rejected.

## Other v1 routes

| Method | Path | Role |
|--------|------|------|
| `POST` | `/api/v1/score/bulk` | Queue up to 1,000 companies |
| `POST` | `/api/v1/score/bulk-inline` | Dashboard CSV, max 50, Clerk session |
| `POST` | `/api/v1/score/person` | Person score |
| `GET` | `/api/v1/score/history` | Score history |
| `*` | `/api/v1/watchlist` | Watchlist API |
| `*` | `/api/v1/prioritize` | Prioritize a set of domains |

The public marketing reference is the in-app page at `/docs` (`app/docs/docs-view.tsx`).

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Bulk scoring](bulk-scoring.md)
- [Routes](routes.md)
