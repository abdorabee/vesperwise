# Signal weights

Source of truth: `TRIGGER_WEIGHTS` and `computeIntentScore` in `lib/scorer.ts`. Active version id: `v2-linear-2026-07`.

## V2 triggers

| Source | Base weight | Role |
|--------|------------:|------|
| Funding | 22 | Scored trigger |
| Hiring | 19 | Scored trigger |
| News | 18 | Scored trigger |
| Technology | 18 | Scored trigger |
| Web | — | Context only |
| GitHub | — | Context only |

The four weights sum to 77. There is no sigmoid and no cross-signal boost.

## Formula

Each source score is normalized to 0–100, then decayed from its own verified `observed_at`:

```text
normalized_i = 100 × clamp(source_score_i / source_max_i, 0, 1)
freshness_i  = 0.85 ^ (max(age_days_i, 0) / 30)
coverage     = Σ(base_weight_i × status_factor_i) / 77
intent_score = round(Σ(effective_weight_i × normalized_i × freshness_i)
                     / Σ(effective_weight_i))
```

`computeFreshness` is that 0.85 curve: a trigger keeps 85% of its value after 30 days. Future timestamps more than five minutes ahead are rejected.

## Status factors

| Status | Coverage factor |
|--------|----------------:|
| `ok` | 1 |
| verified `no_signal` | 1 |
| `stale` | 0.5 |
| `not_found` | 0 |
| `unavailable` | 0 |

Effective weight is base weight times that factor. Verified `no_signal` adds zero points and full coverage.

## Coverage contract

| Coverage | `score_status` | Result |
|----------|----------------|--------|
| `1.0` | `complete` | Full score. Eligible for automation after the baseline run. |
| `0.6` to `<1.0` | `partial` | Score returned with reduced coverage. |
| `<0.6` | `unscorable` | Null score and band. Credit refunded. |

Bands stay HOT ≥ 75, WARM 50–74, COLD < 50. The response lists the arithmetic on `contributions`.

`SCORING_V2_ENABLED=false` selects the older saturated four-trigger engine (`v1-saturated-rollback`). Leave v2 on unless you are rolling back.

V3 weights are a different model. See [scoring v3](scoring-v3.md).

## Related

- [What it does](what-it-does.md)
- [Scoring pipeline](scoring-pipeline.md)
