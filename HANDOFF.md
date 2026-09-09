# Handoff — 2026-09-09

Start here in a **new Cloud Agent session**. Work on **`dev`** (isolated). Do not merge stale PR **#32**.

## Goal for the next session

Keep fixing and testing on `dev`:

1. Remaining Score-chat / env issues (see Open items).
2. Finish Cloud Agent environment Save if the user still wants that.

Do **not** restart the onboarding + AI Elements work. That is already on `dev`.

## Checkout

```bash
git fetch origin
git checkout dev
git pull origin dev
```

Equivalent tip: `ee56e98` on `origin/dev` and `origin/cursor/onboarding-into-dev-a4fe`.

| Branch | Tip | Role |
| --- | --- | --- |
| **`dev`** | `ee56e98` | Isolated working branch. Use this. |
| `cursor/onboarding-into-dev-a4fe` | same SHA | Agent copy of the merge into `dev` |
| `cursor/onboarding-score-chat-handoff-a4fe` | `93192c2` | Original 2-commit PR branch |
| **PR [#41](https://github.com/abdorabee/vesperwise/pull/41)** | draft → **`master`** | Same product commits; still open |

`dev` was 61 commits behind master and still had superseded scoring-v2 / old landing. A content merge would have reintroduced stale files. `ee56e98` is an **ours-strategy merge**: current master-based tree, old `dev` tip `4d3610a` kept as a parent only.

## Product commits (already done)

1. **`ceefd8a`** — `Fix onboarding finish when the users row is missing`
   - `ensureUserRecord` now returns `{ ok: true } | { ok: false, message }` after upsert + read-after-upsert.
   - `PUT /api/user/profile` uses `.select("id").maybeSingle()`; 0 rows → **404**.
   - Dashboard / onboarding show `WorkspaceSetupError` instead of a wizard that cannot save.
   - Outcomes + tests: `lib/user-provisioning-result.ts`, `lib/user-provisioning-result.test.ts` (**7/7**).
2. **`93192c2`** — `Adopt AI Elements v7 on Score chat (phases 1–2)`
   - Chrome: Conversation, Message (`MessageResponse`), PromptInput, Suggestion, Tool.
   - **`Response` and `Actions` are not in the current v7 registry.**
   - `/api/chat` uses AI SDK `streamText` + `instructions` + `inputSchema` tools + `stopWhen: isStepCount(8)`.
   - OpenRouter via `createOpenAI({ baseURL: "https://openrouter.ai/api/v1" }).chat(COPILOT_MODEL)` — **must use `.chat()`**, not the Responses API.
   - SSE events unchanged (`text` / `tool_call` / `tool_result` / `ui` / `done`) so `lib/chat-client.ts` + `GenUiWorkspace` still work.
   - Domain-first scoring (`extractDomain` → `/api/v1/score`) unchanged.

Phases 3–4 (persist/restore rewrite, full registry sweep) were **out of scope**.

## Stack (ignore stale docs)

Live app is **Clerk + OpenRouter + lime `#DFFF00`**. `CLAUDE.md` was rewritten in commit 1. Older notes that say Supabase Auth, Anthropic, or `#D4FF3D` are wrong.

Repo: `https://github.com/abdorabee/vesperwise`  
Preview for PR 41: Vercel project **intentiq**, deployment `dpl_Fdxvy6b4uWbCkKGR7uwp6UEcCP2s` (READY at sha `93192c2`).

Supabase project used in testing: **vesperwise** (ref `grgrigjshxdohcpuhfsg`). There is also `vesperwisecrm` — different product. Use `NEXT_PUBLIC_SUPABASE_URL` from env; do not hardcode it.

## What was verified

### Mechanism / build

- `npx vitest run lib/user-provisioning-result.test.ts` → 7/7.
- `npm run build` succeeded on the handoff branch.
- Targeted ESLint on changed app files was clean. **Repo-wide `npm run lint` still fails on pre-existing files** (autopilot, billing, `.claude/helpers`, etc.).

### Signed-in (this Cloud Agent VM, after secrets)

After correcting env issues locally:

- Clerk **development** (`pk_test_`) sign-in works.
- Onboarding **finish persisted**. New `users` row **2026-09-08 04:35:43 UTC**, `workspace_name = Cloud Agent Test`, `onboarding_completed = true`. Dashboard did **not** bounce back to `/onboarding`.
- Typed `stripe.com` + Score → **WARM 58**, gen-ui cards, mock tech evidence.
- Follow-up **"Who should I contact?"** streamed after the OpenRouter key was a real `sk-or-` key **and** Next.js was restarted in a shell that had the new key (tmux had kept the old invalid key).

### Unsigned / preview

- Landing, `/login`, `/signup` load on the Vercel preview. Clerk UI present.
- Signed-out `/onboarding` is a **read-only preview** (`preview@example.com`) outside production (`proxy.ts` + `VERCEL_ENV`).
- Signed-out `/score` and `/dashboard` redirect to Clerk (`accounts.vesperwise.com` on preview).
- Unsigned `POST /api/chat` is Clerk `protect()` → **HTML 404** (`session-token-and-uat-missing`). The route’s own JSON 401 is not reached because `/api/chat` is not a public matcher.

## Open items (start here)

### 1. Cloud Agent environment — **not Saved**

Personal env: [474ace2b-9d73-11f1-a7d1-d6b4613131ce](https://cursor.com/dashboard/cloud-agents/environments/e/474ace2b-9d73-11f1-a7d1-d6b4613131ce) (DB-managed, no repo `environment.json`).

Proposed scripts (do not put secrets in `environmentJson`):

- `install`: `npm ci` (ran twice, idempotent)
- `start`: `npm run dev -- --hostname 0.0.0.0 --port 3000`

Snapshot `snapshot-20260908-91356fc0-e24e-470b-99ff-868508a0eefc` reached **ready**. Draft build `bld-20260908-e50db613-d2ca-48dd-95a5-4ccbf1fd8395` was **IN_PROGRESS** when that session was interrupted. Check `list-environment-builds`, fetch logs, then **propose + ask the user to Save**. A custom draft does **not** change the saved env until Save.

Secrets were injected mid-run. **A new agent does not automatically get mid-run tmux env.** Write `.env.local` from injected secrets (gitignored). Next.js **process env overrides `.env.local`**.

### 2. Secret pitfalls (re-validate in the new VM)

| Secret | Requirement | What went wrong |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Full `https://…` | First paste was `ttps://…` (missing `h`). Authenticated pages → `Invalid supabaseUrl`. |
| `OPENROUTER_API_KEY` | User key from [openrouter.ai/keys](https://openrouter.ai/keys), starts with `sk-or-` | First key was 64 chars, not `sk-or-`. Chat → OpenRouter **401 Missing Authentication header**. `GET /models` is **public** — a 200 does not validate the key. |
| `TEST_LOGIN_USERNAME` / `PASSWORD` | User must exist on the **same Clerk instance** as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Keys were `pk_test_` / `sk_test_`. A production test user is **not** on the development instance. |
| `MOCK_SIGNALS` | `true` for this VM unless signal vendor keys are injected | User set `false`. `BULLMQ_REDIS_URL` pointed at `redis.railway.internal` (unresolvable here) → typed score can hang. For local tests: `MOCK_SIGNALS=true` and `unset BULLMQ_REDIS_URL`. |

Also required: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Polar keys may exist in the env catalog but are not needed for Score/onboarding.

**Do not commit `.env.local`.** Delete it before any environment snapshot.

### 3. Product follow-ups (not started)

- Score chat phases 3–4 (session persist/restore rewrite, registry sweep).
- Repo-wide lint cleanup (pre-existing).
- Confirm newest `users.created_at` after a signup that uses the **same** Supabase project as production (was stuck at 2026-08-29 until the Cloud Agent test user).
- Optional: if typed PromptInput submit looks like a no-op, check that `onSubmit` receives `message.text` (hot picks call `onScore(domain)` directly and always worked).

## AI Elements / SDK gotchas (already paid for)

- Tools: `inputSchema`, not `parameters`.
- Loop: `isStepCount`, not `maxSteps`.
- System: `instructions` on `streamText`.
- Registry: no `Response` / `Actions`; use `MessageResponse`.
- OpenRouter: `.chat(model)`, not `provider(model)`.
- Brand: `#DFFF00` / `--accent`.
- Accidental `cn` npm package was removed; import `cn` from `@/lib/utils`.
- Root `app/layout.tsx` wraps with `TooltipProvider`.

## Suggested first commands

```bash
git fetch origin dev && git checkout dev && git pull origin dev
npx vitest run lib/user-provisioning-result.test.ts
# if secrets are injected:
# write .env.local (do not commit), unset BULLMQ_REDIS_URL, MOCK_SIGNALS=true
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Then signed-in: `/onboarding` (or `/dashboard` if already done) → `/score` → type a domain → follow-up chat.

## Do not

- Merge [PR #32](https://github.com/abdorabee/vesperwise/pull/32) (`cursor/saas-product-polish-6049`).
- Content-merge the old `dev` scoring-v2 tree onto this branch.
- Treat environment setup as Saved until the user clicks Save.
- Print secret values, test passwords, or Vercel share tokens.
