# Scoring v3

Defined by `DEFAULT_SCORING_POLICY_V3` in `lib/scorer.ts`. Version id: `v3-five-signal-2026-07`. Migration: `supabase/migrations/20260727000000_scoring_v3.sql`.

V2 stays the default. V3 is opt-in.

| Signal | Weight | Half-life (days) |
|--------|-------:|-----------------:|
| Funding | 25% | 180 |
| Hiring | 25% | 45 |
| News | 20% | 30 |
| Technology | 20% | 90 |
| Web activity | 10% | 14 |

Web activity is scored only on v3. On v2 it is context. A missing web-activity source is `unavailable`, not a zero.

Gates:

- Minimum weighted coverage 0.75 (`minimumCoverage`)
- At least four signal-equivalents (`minimumSignalEquivalent`)

## Flags

| Env | Effect |
|-----|--------|
| `SCORING_V2_ENABLED=true` | Default. V2 is what users see. |
| `SCORING_V3_SHADOW_ENABLED=true` | Persist a comparable v3 result in `score_shadow_results` while v2 stays active. |
| `SCORING_V3_ENABLED=true` | Serve v3 as the user-facing score. |

V3 automation stays database-disabled until a separate promotion migration, even when the score itself is user-facing.

## Policies and outcomes

`/api/user/scoring-policy` stores a custom organization, ICP, or vertical policy. The default policy id is `default-v3`.

Pipeline users can attach `closed_won`, `closed_lost`, `no_decision`, or `disqualified` to the exact score snapshot. Those labels are rows in `score_outcomes`.

## Related

- [Signal weights](signal-weights.md)
- [Web enrichment](web-enrichment.md)
