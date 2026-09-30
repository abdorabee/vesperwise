# Handoff: investor-demo UI pass

Branch `claude/ui-ux-audit-investor-t83b0a` (pushed, no PR yet). Base: `master` @ `58c449d`.

## Why this branch exists
The founder is showing VesperWise to an investor who judges on UI. Seven section audits scored the product about 5/10 for "feels like a real SaaS". The layout and chrome were fine; trust was the problem: hard-coded charts, about 30 dead controls, "Coming soon" on the first screen, marketing claims the product can't back up, and a score result that didn't land. Full audits: `docs/ui-audit/01…07-*.md`. Approved plan: `docs/ui-audit/00-plan.md`.

The founder chose:
- **Scope:** Phase 1 (remove fake/broken) + B1–B4 (the scoring "wow" moment and the Home page).
- **Direction:** "Field instrument": precise and ink-first, with lime `#DFFF00` used only as a highlighter (HOT pill, primary CTA, active nav). Never lime text on a light background.
- **Stub pages:** hide People, Inbox and Autopilot from the nav. Their routes still work by URL.

## What's done (all merged on this branch)
| Area | Key files |
|---|---|
| Brand tokens: `--brand` #DFFF00 / hover #E8FF40, `--on-brand`, `--brand-ink`; dark lime buttons have ink text; mojibake glyphs fixed | `app/theme-overrides.css`, `app/globals.css` |
| Shared score UI: `BandPill`, `ScoreNumber` (one-time count-up), `ScoreMeter` (50/75 ticks), `CompanyMark` (favicon) | `components/score/band.tsx` |
| Landing: demo video replaces the HTML mockup and mascot; honest copy; one plan source | `components/landing/hero-video.tsx`, `components/landing/demo-accounts.ts`, `public/demo/*`, `lib/plan-features.ts` (+ `lib/billing-plans.ts` reads it) |
| Marketing pages: unbacked claims removed (SOC 2, uptime, bug bounty, CRM integrations, fake endpoints) | `app/docs`, `app/contact`, `app/about`, `app/legal/*`, `app/pricing` |
| Nav: People/Inbox/Autopilot/"Soon" hidden; real logo; plan badge; credits meter in sidebar; `(dashboard)/error.tsx` | `components/dashboard/nav-config.ts`, `app-sidebar.tsx`, `brand-mark.tsx`, `lib/dashboard-search.ts` |
| API Keys page (create / show once / list / revoke); `last_used` is stamped on API calls | `app/(dashboard)/api-keys`, `lib/api-keys.ts`, `app/api/v1/score/route.ts` |
| Billing: fake VISA/PCI/tax and dead buttons removed | `components/billing/*` (guarded by `billing-honesty.test.ts`) |
| Pipeline: pills coloured by score band; dead controls removed | `app/(dashboard)/pipeline/*` |
| Home rebuilt on real data: KPIs, Hot accounts, band trend, first-run; `scripts/seed-demo.ts` | `app/(dashboard)/dashboard/*`, `components/dashboard/home/*`, `lib/dashboard-home.ts` |
| Score result redesign (hero → Why now → Next move → evidence) | `components/score/gen-ui/workspace.tsx`, `lib/gen-ui.ts` |
| Live research progress: real per-source progress over SSE (`Accept: text/event-stream`); JSON API unchanged | `lib/score-service.ts` (`onProgress`), `lib/score-progress.ts`, `app/api/v1/score/route.ts`, `app/(dashboard)/score/score-view.tsx`, `components/score/score-research-status.tsx` |
| Evidence shows human source names, links, "+N pts", "N d ago"; restore the last result without rescoring (`/score?domain=x&view=last`) | `lib/source-labels.ts`, `lib/stored-score.ts`, `app/api/dashboard/scores/latest` |
| History and Watchlist: dead controls wired or removed; ⋯ menu with undo; validated palette | `app/(dashboard)/history/*`, `components/watchlist/*` |
| Review page with sample data, no login needed | `app/dev/preview/page.tsx` (`?view=home\|score\|research\|first-run`) |

**Verified in the cloud session:** `npx tsc --noEmit`, `npm run lint` and `npm test` (413 passed, 5 skipped) are clean, and `next build` succeeds. On `next start`, the banned strings (Solo-built, Spring '26, SOC 2 Type II, HubSpot, Salesforce, #customers, Vanta, Coming soon) are gone from all public pages; `<video>` renders; the `/demo/*` assets return 200.

**Not verified:** no human has looked at any page in a real browser. The cloud sandbox couldn't render screenshots (a single late one of `/` looked right) and couldn't sign in. **The first job of the local session is a visual pass.**

## Run it
```bash
npm install
MOCK_SIGNALS=true npm run dev
# public:   /  /pricing  /docs  /about  /legal/security  /legal/dpa
# preview:  /dev/preview?view=home | score | research | first-run   (sample data, no login)
# real app: /dashboard /score /history /watchlist /api-keys /billing (needs .env.local with Clerk + Supabase)
```

## Next steps, in order
1. **Visual pass** on every page above: desktop 1440 dark and light, and 390 px mobile. Fix clipped text, overflow, contrast and spacing. Pay most attention to the score result, Home, the hero video and pricing. Use the installed skills `better-ui`, `emil-design-eng` and `frontend-design`.
2. **Autopilot is still advertised on the landing page:** the top announcement bar says "New: Autopilot…" and the nav has an "Autopilot" link, but Autopilot is hidden in the app. Remove both, or reword them as "coming soon", whichever the founder decides. (`components/landing/LandingNav.tsx` / `LandingPage.tsx`.)
3. **Test the signed-in golden path** with real keys: Home → score a fresh domain (live progress rows fill in, then the count-up) → evidence links → Draft outreach → Save to watchlist → Watchlist → open the last score (no rescore). Check SSE errors: 402 with no credits, and 409 when a score is already in progress.
4. **Seed the demo account:** `npx tsx scripts/seed-demo.ts --user <clerk_user_id> --count 30`. Run it with `--dry-run` first; it has never run against a real database.
5. **Founder to confirm the DPA processor line:** "VesperWise Labs, Inc., 5 Sherif Pasha St., Downtown Cairo" (`app/legal/dpa/dpa-view.tsx`, from upstream master).
6. Open a PR to `master` once the visual pass is clean. Check the Vercel preview there too.

## Known limits (intentional)
- History "sort by Δ" only reorders the loaded page, because deltas are computed client-side.
- `/api/v1/score/bulk` is documented as early access; the bulk processor isn't wired up.
- The API keys list can't show a key prefix, because only hashes are stored.
- Home KPIs use fixed 7-day windows; only the trend and the activity feed follow `?range=`.
- The band-trend chart is hand-built SVG/CSS (Recharts isn't installed).

## Deferred until after the meeting (see 00-plan.md)
- B5: flatten the nav to about 7 items.
- C1: token consolidation (47 font sizes → 7, 1,320 inline styles, the 9.8k-line `globals.css`).
- Flip the default theme to light for the full Field-instrument look.
- Leftover legacy CSS near `globals.css` L8800+, `responsive.css` and `theme-overrides.css`.

## Gotchas
- **Stack:** Clerk auth, OpenRouter AI, lime `#DFFF00` (hover `#E8FF40`, never `#D4FF3D`). Read `CLAUDE.md`.
- **Middleware:** it lives in `proxy.ts` (not `middleware.ts`) and uses `lib/route-access.ts`. Every `(dashboard)` section must be listed there; `route-access.test.ts` enforces it.
- **Tests that guard this pass:** `score-motion.test.ts` bans fake timed progress steps; `billing-honesty.test.ts` bans the fake billing details; `dashboard-home.test.tsx` bans "Coming soon", Autopilot and `⋯` on Home.
