# Getting started

## Install and run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm test
npm run test:watch
```

Other scripts:

| Script | Use |
|--------|-----|
| `npm run test:scoring-db` | Transactional scoring tests. Refuses any database name that is not explicitly confirmed. |
| `npm run test:cache-queue-db` | Postgres cache and queue tests. Same class of destructive reset. |
| `npm run dead-code` | Knip production file and dependency check. |
| `npm run generate:favicon` | Regenerates the favicon from the brand mark. |

## Environment

Create `.env.local`. The full template is in the [README](../../README.md#2-configure-environment).

Minimum for a mock local app:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
MOCK_SIGNALS=true
SCORING_V2_ENABLED=true
```

`OPENROUTER_API_KEY` is optional. Without it, score reasoning uses the deterministic fallback.

Leave these at their safe defaults unless you are running the matching worker:

- `BACKGROUND_JOBS_ENABLED=false` so the web app does not enqueue jobs nothing will consume
- `SCORING_V3_ENABLED=false` and `SCORING_V3_SHADOW_ENABLED=false`
- `SCRAPLING_SHADOW_MODE=true` and `WEB_ENRICHMENT_SHADOW_MODE=true`

`CACHE_DISABLED=true` turns every cache read and write into a no-op. Use it for tests, not as a production setting.

## Signed-in browser checks

Signup is the custom form at `/signup`, not Clerk's hosted accounts site. A new inbox (temp-mail.org or guerrillamail.com) avoids Clerk MFA on a reused login. Submit the 6-digit code once and wait for `/dashboard`.

`/onboarding` is a signed-out preview only when `VERCEL_ENV` is not `production`. Do not treat that preview as a real workspace.

## Database

Migrations live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
supabase db push
```

The scoring integration suite is documented in [database migrations](database-migrations.md).

## Related

- [Tech stack](tech-stack.md)
- [Deployment](deployment.md)
