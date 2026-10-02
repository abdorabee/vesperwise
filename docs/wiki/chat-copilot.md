# Chat copilot

The score workspace includes a chat thread with score cards inline. Route: `app/api/chat/route.ts`. Sessions: `app/api/chat/sessions`.

- Model: `COPILOT_MODEL`, default `anthropic/claude-sonnet-4`, via OpenRouter.
- History tables: `chat_sessions`, `chat_messages` (migration `20260317000000_chat_and_pipeline.sql`).
- Price: `CHAT_CREDIT_COST = 0.25` credits per message (`lib/types.ts`).

`/api/chat` is on the public middleware allow-list. The route handler still requires a signed-in user and debits credits itself.

Score reasoning is a different call. Company scores use `lib/reasoning.ts` and the Gemini flash models, one request per score, schema-validated. Chat does not rescore the company.

## Related

- [Billing](billing.md)
- [What it does](what-it-does.md)
