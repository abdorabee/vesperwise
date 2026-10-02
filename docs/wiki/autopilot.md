# Autopilot

Autopilot reruns scores on a schedule and fires actions when conditions match. Types are in `lib/types.ts`. HTTP routes are under `app/api/autopilot/`.

## Scope and schedule

- Source: the watchlist, or an explicit domain list.
- Schedule: `daily` or `weekly`.
- Condition logic: `any` (OR) or `all` (AND).

## Conditions

| Type | Params |
|------|--------|
| `score_above` | `{ threshold }` |
| `score_below` | `{ threshold }` |
| `score_change` | `{ direction: "up" \| "down" \| "any", min_change }` |
| `band_change` | `{ from?, to? }` |
| `signal_spike` | `{ signal, min_ratio }` |

## Actions

| Type | Params |
|------|--------|
| `email_draft` | `{ tone?: "formal" \| "casual" \| "executive" }` |
| `webhook` | `{ url, headers? }` |
| `slack` | `{ webhook_url }` |
| `pipeline_stage` | `{ stage }` |
| `notification` | `{}` |

## When a run is allowed

Automation runs after a score is persisted. A `complete` score can arm automation after the baseline run. Partial and unscorable results do not. V3 can be user-facing while its automation flag stays off in the database until a separate promotion migration. See [scoring v3](scoring-v3.md).

Run history is stored with the workflow (`total_runs`, `last_run_at`) and exposed at `/api/autopilot/runs`. `/api/autopilot/test` exercises a workflow without waiting for the schedule.

## Related

- [Scoring pipeline](scoring-pipeline.md)
- [Routes](routes.md)
