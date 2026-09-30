# Handoff 2: demo data and polish after the local review

Branch `claude/ui-ux-audit-investor-t83b0a`, PR https://github.com/abdorabee/vesperwise/pull/60 (open, CI green). Read `CLAUDE.md` and `docs/ui-audit/HANDOFF.md` first. This note covers only what is left after the local review session.

## State right now
- The visual pass, the Autopilot/People copy sweep and the watchlist score fix are all merged on the branch and pushed. Typecheck, lint and tests pass (421 passed, 5 skipped).
- The Vercel Preview uses the Clerk **dev** instance (`pk_test`, `usable-perch-48.clerk.accounts.dev`). Production keeps the live keys. Previews used to fail login with `Unexpected token '<'` because they got the live key.
- Latest preview: https://intentiq-2h0fj6f3r-abdorabees-projects.vercel.app (the URL changes on every redeploy).
- Demo account: Clerk `user_3K0LGwYKJWiMgfRb3UNLs8Kv2vn` (xikopo8750@cwsgear.com), Free plan, 19.75/20 credits. It lives in the Clerk dev instance, and its data is in production Supabase `grgrigjshxdohcpuhfsg`.
- Seeded data: 30 live-signal scores (0 HOT, 2 WARM, 28 COLD). There are also 2 older **mock** scores, Splash Int and Egyptoil Gas, which show "SAMPLE DATA" / "— MOCK".

## Task 1: fill the watchlist for the demo (ask the founder first)
The Intent Hub (`/pipeline`) and the Watchlist only list **watchlisted** accounts. Right now the only one is the mock Egyptoil Gas, and `scripts/seed-demo.ts` never adds companies to the watchlist.

The Free plan caps the watchlist at 5 (`PLAN_WATCHLIST_LIMIT`). The founder has **not decided** between:
- **A.** Soft-remove Egyptoil Gas and add the top 5: mongodb.com 56, atlassian.com 52, cloudflare.com 35, hubspot.com 34, snowflake.com 33.
- **B.** Set the demo account to Growth (250 slots) in production `users`, then add all 30. This isn't a real Polar subscription, and it changes what Billing shows.
- **C.** Keep Egyptoil Gas and add the top 4.

How to do it:
- Use the existing `POST /api/dashboard/watchlist`. Since commit `5fa2c01` it copies in the latest stored score. Either call it from a signed-in browser (`fetch`), or insert rows with the same fields through the service role.
- Soft-remove means `DELETE /api/dashboard/watchlist?domain=…`, which sets `is_active=false`.
- Consider adding an optional `--watch N` flag to `seed-demo.ts` so this can be repeated.
- Afterwards, check `/pipeline` and `/watchlist` on the preview.

## Task 2: History "Credits used (30d)" counts runs, not credits
`app/(dashboard)/history/history-view.tsx:563` uses `stats.monthlyCount`, which is the number of score runs. The seed ran 30 scores with `skipCredits`, so History says 32 while Billing correctly says 0.25 used.
- Relabel it as "Scores (30d)".
- Only keep a credits label if you compute real credits from the ledger that Billing uses (`components/billing/*`).
- Add or adjust a test.

## Task 3: Billing page polish
- `components/billing/billing-hero.tsx:21,126-129` shows "resets in 0 days". `daysUntilReset(subscription_renews_at)` returns 0 for a Free account with a past or empty renewal date.
  - Hide the reset line when there's no future renewal, or show "resets on {date}".
  - Say "1 day" when there is exactly one day left.
- `components/billing/billing-page-head.tsx:22`: the "Billing & credits" title renders right-aligned at narrow widths (390px, and in the in-app browser pane). It should be left-aligned like the other page heads (compare History and Watchlist).
- Do not bring back anything `billing-honesty.test.ts` bans.

## Known issues, not in scope unless asked
- **Scoring quality (separate session).** Across the 30 seeded companies:
  - Hiring: `ok` 15, `no_signal` 15.
  - Funding: `ok` 28, but undated rounds decay to about 0 points.
  - News: `ok` 20.
  - Technology: always unavailable (BuiltWith free tier).
  - The 5 companies at 0 (figma, plaid, hashicorp, canva, intercom) have no hiring, no news, and funding that has decayed away.
- **Draft outreach credit bug.** The reply said "Testing mode · no credit charged", but 0.25 was deducted (20 → 19.75).
- **Redis/BullMQ (being handled in a fork).** `BULLMQ_REDIS_URL` points at `redis.railway.internal`, and the seed script never exits.
- **Demo polish.**
  - The mongodb.com stored draft contains a literal "[specific pain]".
  - Company names are derived from the domain ("Mongodb").
  - `DISABLE_CREDIT_CHECK` must be unset before the demo.
  - The DPA processor line needs the founder's confirmation.

## Environment gotchas
- The founder's shell exports an old, out-of-credits `EXPLORIUM_API_KEY` and a read-only `GITHUB_TOKEN`. Both override `.env.local`, because dotenv doesn't override variables that are already set.
  - Prefix scripts with `env -u EXPLORIUM_API_KEY`.
  - Push with: `env -u GITHUB_TOKEN git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`.
  - Run `gh` with `env -u GITHUB_TOKEN`.
- Turbopack sometimes serves stale `app/globals.css` after edits. Stop the dev server, delete `.next/dev` and `.next/cache`, and restart.
- **Vercel CLI.**
  - It's logged in on this machine; use `npx vercel@latest`.
  - The repo is linked: `.vercel/project.json` points at project `prj_5xcO9WCPLuPfeDS0YZMrZ4xSGFLk`, team `team_kTrlOBV7366hoOAOoFIcFExX`.
  - `vercel link` also added `VERCEL_OIDC_TOKEN` to `.env.local`.
  - Redeploying through the CLI was blocked by a permission prompt, so ask the founder to click Redeploy in the dashboard.
- **Browser checks.** For real 1440/390 screenshots in both themes, use Playwright with the installed headless shell, via gstack's `playwright` package: `executablePath: ~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`. Set the theme with `localStorage.intentiq-theme`.
- Local `.claude/launch.json` has `dev` (it unsets `EXPLORIUM_API_KEY`) and `dev-mock` (it sets `MOCK_SIGNALS=true`). The file isn't committed.

## Rules for this branch
- Lime `#DFFF00` is a highlighter only; use `--brand-ink` for lime-family text on light backgrounds.
- Show the founder screenshots before committing visual changes.
- Commit messages end with the Co-Authored-By line. Push only when asked.
