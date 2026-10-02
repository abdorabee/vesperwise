# What it does

VesperWise scores companies by purchase intent. A score is time-bound evidence plus a separate fit check, not a blended black-box number.

## Intent score

The active model (`v2-linear-2026-07` in `lib/scorer.ts`) scores four triggers:

- funding
- hiring
- news
- technology change

Web authority and GitHub activity are fetched and stored as context. They do not change `intent_score` on v2.

The result is a 0–100 score, a band, source coverage, and per-signal contributions. Bands:

| Band | Range |
|------|-------|
| HOT | 75–100 |
| WARM | 50–74 |
| COLD | 0–49 |

Coverage below 0.6 returns `unscorable`: a null score and band, and the reserved credit is returned.

## ICP fit

`icp_fit_score` compares the company to the workspace business profile. It is returned beside the intent score and is never mixed into it. A workspace without a verified profile does not get a fit score.

## What a rep gets back

`lib/reasoning.ts` asks OpenRouter for one schema-checked explanation: summary, recommended action, buying stage, urgency, triggers, why-now, email subject, and talk track. If `OPENROUTER_API_KEY` is unset or the model reply fails validation, the route returns a deterministic fallback and marks it as such.

## Related

- [Signal weights](signal-weights.md)
- [Scoring pipeline](scoring-pipeline.md)
- [Scoring v3](scoring-v3.md)
