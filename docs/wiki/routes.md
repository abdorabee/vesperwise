# Route groups

`lib/route-access.ts` is the auth map. `proxy.ts` calls it from Clerk middleware. Private pages are an allow-list, so unknown paths 404 instead of redirecting to sign-in. API routes are deny-by-default except the public patterns below.

## Private pages

Every directory under `app/(dashboard)` is in `PRIVATE_PAGE_SECTIONS`:

| Path | Role |
|------|------|
| `/dashboard` | Home |
| `/score` | Company score and chat |
| `/analyze` | Analysis view |
| `/people` | Person scores |
| `/bulk` | CSV scoring |
| `/watchlist` | Watched accounts |
| `/lists`, `/lists/[id]` | Saved lists |
| `/pipeline` | Stages and outcomes |
| `/history` | Past scores |
| `/inbox` | Notifications |
| `/autopilot` | Workflows |
| `/billing`, `/settings/billing` | Plan and credits |
| `/settings`, `/settings/account`, `/settings/profile` | Workspace settings |
| `/api-keys` | API keys |

`/onboarding` and `/dev/*` require auth in production. Outside production they are readable previews. The signed-out onboarding preview is `preview@example.com` and is not a real workspace.

## Public pages

Marketing and legal pages are public: `/`, `/pricing`, `/about`, `/contact`, `/docs`, `/privacy`, `/terms`, `/legal/*`, `/thank-you`, plus `/login` and `/signup`.

## Public API patterns

These do not require a Clerk session. Handlers still authenticate API keys or verify webhook signatures themselves.

- `/api/v1/*`
- `/api/chat` and `/api/chat/*`
- `/api/billing/webhook`
- `/api/contact`

## Authenticated API groups

| Prefix | Role |
|--------|------|
| `/api/billing/checkout`, `/topup`, `/portal` | Polar checkout, credit packs, customer portal |
| `/api/user/api-keys` | Create and list API keys |
| `/api/user/profile` | Business profile. `PUT` must update an existing row. Zero rows is 404. |
| `/api/user/account` | Workspace account fields |
| `/api/user/scoring-policy` | Custom v3 policy |
| `/api/autopilot/*` | Workflows, runs, execute, test |
| `/api/dashboard/*` | Scores, lists, watchlist, pipeline, search |
| `/api/inbox` | In-app notifications |

`/api/v1` is public at the middleware layer and checks the API key or session inside the route.

## Related

- [Architecture](architecture.md)
- [Score API](score-api.md)
