# Billing

Polar.sh is the payment provider. Prices and credit amounts live in code so the UI cannot drift from enforcement.

| Plan | USD / month | Credits / month | Watchlist | API rate |
|------|------------:|----------------:|-----------|----------|
| Free | 0 | 20 | 5 | 10 req/min |
| Starter | 29 | 500 | 50 | 100 req/min |
| Growth | 79 | 2,500 | 250 | 100 req/min |
| Pro | 199 | 8,000 | 1,000 | 100 req/min |
| Agency | 499 | 25,000 | unlimited | 100 req/min |

Constants: `PLAN_CREDITS`, `PLAN_WATCHLIST_LIMIT`, and `PLAN_RATE_LIMIT` in `lib/types.ts`. Prices and copy: `PLAN_PRICE` and `TOPUP_PACKS` in `lib/plan-features.ts`.

One-time packs (they add credits and do not change the plan):

| Credits | Price |
|--------:|------:|
| 100 | $10 |
| 500 | $36 |
| 1,000 | $65 |

## Webhooks

`app/api/billing/webhook/route.ts` verifies `POLAR_WEBHOOK_SECRET`.

| Event | Effect |
|-------|--------|
| `subscription.created`, `subscription.updated` | Set plan and reset `credits_remaining` to that plan's monthly amount |
| `order.paid` | Add a top-up pack |
| Subscription ended / canceled path | Return the workspace to the free credit amount |

Product ids come from `POLAR_PRODUCT_STARTER`, `POLAR_PRODUCT_GROWTH`, `POLAR_PRODUCT_PRO`, `POLAR_PRODUCT_AGENCY`, and `POLAR_PRODUCT_TOPUP_100`, `_500`, `_1000`.

## Charging

A company score reserves one credit. Chat messages cost `CHAT_CREDIT_COST` (0.25) in `lib/types.ts`. Cache hits on company scores are free. The queued bulk endpoint checks the credit balance and does not debit it; see [bulk scoring](bulk-scoring.md).

Checkout and the customer portal are `POST /api/billing/checkout`, `POST /api/billing/topup`, and `POST /api/billing/portal`.

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Deployment](deployment.md)
