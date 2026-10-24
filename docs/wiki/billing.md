# Billing

Polar.sh is the payment provider. Prices and credit amounts live in code so the UI cannot drift from enforcement.

| Plan | USD / month | Credits / month | Watchlist | API rate | Bulk and CSV | Autopilot workflows | Treg paid fallbacks | Seats |
|------|------------:|----------------:|-----------|----------|--------------|---------------------|---------------------|------:|
| Free | 0 | 20 | 5 | 10 req/min | no | 0 | no | 1 |
| Starter | 10 | 100, no rollover | 25 | 20 req/min | no | 0 | no | 1 |
| Plus | 29 | 400 | 75 | 60 req/min | yes | 3 | no | 1 |
| Growth | 79 | 1,200 | 250 | 100 req/min | yes | 20 | yes | 1 |
| Pro | 199 | 3,000 | 1,000 | 100 req/min | yes | 50 | yes | 1 |
| Agency | not sold | 25,000 | unlimited | 100 req/min | yes | unlimited | yes | 1 |

Agency is no longer sold. The public card says Contact us. The `agency` key and the entitlements above stay so granted accounts keep working. A granted plan has no Polar subscription: billing shows the plan name, "Granted, no charge", and an expiry when one is stored. Upgrade and Downgrade are hidden.

The pricing page lists Autopilot as coming soon and does not advertise workflow counts. Starter says "No bulk, CSV or autopilot".

Constants: `PLAN_CREDITS`, `PLAN_WATCHLIST_LIMIT`, `PLAN_RATE_LIMIT`, and `PLAN_AUTOPILOT_LIMIT` in `lib/types.ts`. Prices, copy, and `canUseFeature` live in `lib/plan-features.ts`. Upgrade path: Starter → Plus → Growth → Pro.

One-time packs (they add credits and do not change the plan):

| Scores | Price |
|-------:|------:|
| 25 | $3 |
| 70 | $8 |
| 140 | $15 |

## Webhooks

`app/api/billing/webhook/route.ts` verifies `POLAR_WEBHOOK_SECRET`.

| Event | Effect |
|-------|--------|
| `subscription.created`, `subscription.updated` | Set plan and reset `credits_remaining` to that plan's monthly amount plus unused top-ups |
| `order.paid` | Add a known top-up pack |
| Subscription ended / canceled path | Return the workspace to the free credit amount when the subscription is revoked |

Product ids are read from the environment at request time. Sold plans: `POLAR_PRODUCT_STARTER`, `POLAR_PRODUCT_PLUS`, `POLAR_PRODUCT_GROWTH`, `POLAR_PRODUCT_PRO`. Top-ups: `POLAR_PRODUCT_TOPUP_25`, `POLAR_PRODUCT_TOPUP_70`, `POLAR_PRODUCT_TOPUP_140`. There is no agency checkout product. An unknown or archived product id is logged and ignored. It does not return 500.

## Charging

A company score reserves one credit. Chat messages cost `CHAT_CREDIT_COST` (0.25) in `lib/types.ts`. A 6-hour cache hit on a company score costs 0 credits and writes no debit row. Bulk jobs debit one credit per scored company, leave cache hits free, write a ledger row for each debit, and stop when the balance cannot cover the next score. The debit is the same atomic reservation used by single scoring, so concurrent jobs cannot overspend.

The header credit counter updates from `credits_remaining` on the score response.

The low-credit warning uses the remaining balance against the plan allowance. The upgrade prompt appears when 80% of that allowance is used, and when a gated feature is clicked.

Checkout and the customer portal are `POST /api/billing/checkout`, `POST /api/billing/topup`, and `POST /api/billing/portal`.

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Bulk scoring](bulk-scoring.md)
- [Deployment](deployment.md)
