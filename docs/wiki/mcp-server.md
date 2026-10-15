# MCP server for Claude

`app/api/mcp/route.ts` serves VesperWise as a remote MCP server over Streamable HTTP, so a user can ask Claude things like "which of my accounts heated up this week, draft me an opener".

## How it works

- **Transport:** stateless Streamable HTTP. Every `POST /api/mcp` builds a fresh server (`lib/mcp/server.ts`) for the caller; `GET` and `DELETE` return 405.
- **Auth:** `Authorization: Bearer vesperwise_…`, the same keys as `/api/v1` (created on `/api-keys`). `lib/api-key-auth.ts` resolves the key to the Clerk user id; tools only ever act for that user.
- **Credits:** only `score_company` spends credits, through `scoreCompany()` exactly like `POST /api/v1/score` (1 per fresh score, free on a personalized cache hit). Everything else is a read or a watchlist write.
- **Progress:** when the client sends a progress token, `score_company` forwards the scorer's progress events as MCP progress notifications.

## Tools

| Tool | Credits | Notes |
|------|---------|-------|
| `score_company` | 1, or 0 when cached | Trimmed score: band, triggers, why now, action, signal summaries |
| `get_company` | 0 | Latest stored score, with its age in days |
| `score_history` | 0 | Last 90 days, active scoring version |
| `list_watchlist` | 0 | Filter by band or pipeline stage |
| `add_to_watchlist` / `remove_from_watchlist` | 0 | Plan account limit enforced |
| `whats_changed` | 0 | Moves, HOT crossings and new scores in the last N days; lists accounts not re-scored |
| `prioritize` | 0 | Ranks up to 200 domains by stored score |
| `get_opener_brief` | 0 | Why now, triggers, subject, talk track; Claude writes the email |
| `get_account` | 0 | Plan, credits, reset date, watchlist usage |

Prompts: `morning_brief`, `check_company`.

## Connecting

Claude Code:

```bash
claude mcp add --transport http vesperwise https://www.vesperwise.com/api/mcp \
  --header "Authorization: Bearer vesperwise_YOUR_KEY"
```

Any client that supports remote HTTP servers with a custom header works the same way. One-click claude.ai connectors need OAuth, which is not built yet.

## Known gaps

- Nothing re-scores watchlist accounts on a schedule, so `whats_changed` only sees scores someone ran. It reports those accounts as stale rather than unchanged.
- Person scoring and bulk scoring are not exposed.
- The per-plan request rate in `PLAN_RATE_LIMIT` is not enforced for `/api/v1` or `/api/mcp`.
