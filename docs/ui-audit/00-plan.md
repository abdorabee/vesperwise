# VesperWise — investor-demo UI pass (Phase 1 + B1–B4)

## Context
The founder is showing VesperWise to an investor who judges heavily on UI. Seven subagent audits of `master` (prod `www.vesperwise.com` is blocked by the sandbox egress policy, so we ran master locally + read source) scored it **~5/10** for "feels like a real SaaS". The chrome is good (shadcn sidebar, ⌘K, honest coverage-incomplete state), but trust breaks: hard-coded charts, ~30 dead controls, "Coming soon" ×4 on the home screen, marketing claims the product can't back up, and a scoring result that doesn't land visually.

User decisions: **Scope = Phase 1 + B1–B4** · **Direction = "Field instrument"** (light-first, lime as a highlighter under ink; applied to new/rebuilt components now, full theme flip later) · **People / Inbox / Autopilot = hide from nav** (routes stay).

Audit reports (evidence with file:line) live in the scratchpad `audit/01…07-*.md`; they will be committed to `docs/ui-audit/` so they survive the container. Scorecard page `vesperwise-ui-audit.html` is ready to publish as a private artifact on approval.

Branch: `claude/ui-ux-audit-investor-t83b0a`. One commit per step below; push at the end.

---

## Phase 1 — Remove everything fake or broken (~1–1.5 d)

**A1 · Honest copy pass**
- `components/landing/LandingPage.tsx`: delete the "Solo-built · v0.1" trust strip (~L479); update the "Spring '26" badge; remove the HubSpot/Salesforce/Gmail/Outreach/Apollo/Zapier tiles (only Slack + webhook exist, `lib/autopilot.ts:237`); replace the "6h cache / 5 signals / AI" filler stats; make all mockups read from one data array, so a 78 is never labelled WARM and the same company has the same score everywhere.
- `components/landing/LandingNav.tsx` + other navs: drop `/#customers` and dead `#` links.
- `/docs`, `/contact`, `app/legal/*` (DPA, security): remove SOC 2 report promises, bug bounty, 99.97% uptime, latency/cache figures, sales-engineer and CRM claims; keep /docs to endpoints that exist (`app/api/v1/*`) and fix the curl example.
- One shared plan-features source (`lib/types.ts` plan constants → new `lib/plan-features.ts`) consumed by the landing pricing teaser and `/pricing`.

**A2 · Dead controls: wire the few that matter, delete the rest**
- `components/dashboard/home/dashboard-home.tsx`: delete fake sparklines (L178–252) and the literal SVG distribution chart (L317–327) (rebuilt in B4); delete All/Mine and the `⋯` spans.
- `app/(dashboard)/history/history-view.tsx`: wire range + sort-by-score/Δ (query params); delete Stage/Filter/row `⋯`.
- `components/watchlist/watchlist-table.tsx`: `⋯` becomes a DropdownMenu (Open last score / Rescore / Remove with undo toast); hide the no-op star.
- `components/billing/*`: remove the hard-coded VISA / PCI-COMPLIANT / "Tax · included", Download statement, Pause, Year chip, and the fake 90D; show what Polar actually returns.
- Pipeline: delete Group/Sort/Options/filter chips and the "coming soon" tabs.

**A3 · Hide stubs, fix Pipeline colours**
- `components/dashboard/nav-config.ts` + `lib/dashboard-search.ts`: remove People, Inbox, Autopilot (and the "Soon" badges) from the sidebar and ⌘K. Routes stay reachable by URL.
- Remove the Autopilot KPI and card from home (`dashboard-home.tsx:226, 592–610`).
- `app/(dashboard)/pipeline/page.tsx:285`: colour pills by `score_band`, not by column.

**A4 · Minimal API Keys page**
- Replace the "Coming soon" at `app/(dashboard)/api-keys/page.tsx` with create (show the secret once + copy) / list (prefix, created, last used) / revoke, calling the existing `app/api/user/api-keys/route.ts`. Use shadcn `Table`, `Dialog` and `PageHeader` from `components/app-ui/page-primitives.tsx`. Restore it to the nav.

**A5 · Quick visual bugs + brand tokens**
- `app/globals.css:110`: dark `--primary-foreground` → ink (fixes the invisible Score arrow and every lime button).
- `app/globals.css:4238, 4244`: fix mojibake `â–²/â–¼` → `"\25B2"` / `"\25BC"`.
- `app/theme-overrides.css`: `--brand` back to `#DFFF00`, hover `#E8FF40`; add `--on-brand` (ink) and `--band-hot/warm/cold` tokens for light and dark. Restore `--accent` where 50 lime usages now render grey (check the Pro plan swatch).
- Sidebar/mobile header: real logo glyph (`components/vesperwise-logo.tsx`) instead of the "V" square; plan as a `Badge`; always-visible credits meter in the sidebar footer (reuse the `nav-user.tsx` meter).
- Add `app/(dashboard)/error.tsx` using `InlineError` + `reset()`.

**A6 · Landing hero demo video (replaces the HTML mockup)**
- Input: the founder will upload the demo video in chat. Transcode it to `public/demo/vesperwise-demo.mp4` (H.264, ~1440 px wide, target ≤8–10 MB, audio stripped for the muted loop) plus `vesperwise-demo.webm` and a `poster.jpg` first frame, using `ffmpeg-static` via npx in the scratchpad (nothing added to package.json). If it is long (>30 s), check with the founder whether to cut a 10–20 s loop.
- `components/landing/LandingPage.tsx`: delete the hero HTML/CSS mockup and its now-unused CSS blocks in `app/globals.css` / `app/responsive.css`. In its place add a new `components/landing/hero-video.tsx`: a minimal browser-frame chrome around `<video autoplay muted loop playsInline preload="metadata" poster>` with webm+mp4 sources, `aspect-ratio` set so there is no layout shift, a pause/play button (keyboard-accessible, respects `prefers-reduced-motion` by showing the poster and not autoplaying), and lazy playback via IntersectionObserver on mobile.
- Also remove the 200 px mascot from the hero (audit L-top3). Keep the headline and CTAs above the video.
- Verify: `curl` localhost `/` shows the `<video>` tag and poster, with no leftover mockup markup; the asset sizes are reported to the founder.

## Phase 2 — The wow moment (~2–3 d)

**B1 · Score result redesign** (`components/score/gen-ui/workspace.tsx`, data from `lib/gen-ui.ts`)
- New shared `components/score/band.tsx`: `<ScoreNumber>` (tabular, count-up once per fresh score, skipped under reduced motion), `<BandPill>` (token colour + text label), `<ScoreMeter>` (0–100 with 50/75 ticks). Reuse on History, Watchlist and Pipeline.
- Hero: favicon + company · big number /100 · band pill · meter · "Urgency · Stage · ICP fit" (already computed at `lib/gen-ui.ts:172–176`, never shown).
- Order: hero → Why now (larger) → Recommended next move (lime-highlight surface, Draft outreach as primary) → evidence → supporting context collapsed.
- Delete the dead `components/score/score-result-card.tsx` and update its typography test.

**B2 · Live research progress (real, not simulated)**
- `lib/score-service.ts`: add an optional `onProgress?(event)` to `ScoreCompanyOptions`, pass it into `getEvidenceSnapshot` (L563) and emit `signal_done {key,status,detail,observed_at,source}` inside the per-key `Promise.all` (L602), then `reasoning_start` / `reasoning_done` around the reasoning call (~L1393). Cached and mock paths emit all rows at once.
- `app/api/v1/score/route.ts`: when `Accept: text/event-stream`, stream the events via `ReadableStream` and finish with a `result` event. JSON behaviour stays unchanged for API clients.
- `app/(dashboard)/score/score-view.tsx` `runScore` (L152) consumes the stream; `components/score/score-research-status.tsx` fills its existing skeleton rows in place as each source arrives. Keep the copy "Verifying current signals" and satisfy `components/score/score-motion.test.ts` (no `STEPS`, no `setInterval`).

**B3 · Evidence people can trust**
- New `lib/source-labels.ts` maps provider ids to human names ("scrapling" → "Company careers page", "explorium-events" → "Funding & hiring data", "open-page-rank" → "OpenPageRank", …). In mock mode, hide "— MOCK" and show one "Sample data" pill.
- Carry `evidence[0].source_url`, `daysAgo` and `contribution` from `lib/types.ts` through `lib/gen-ui.ts` into `SignalAxis`. Rows show a contribution bar, "+18 pts", "42 d ago" (absolute date in a tooltip) and a source ↗ link, sorted by contribution. Add a "Fetched N min ago" stamp in the card header.

**B4 · Home = "who to call today"** (`app/(dashboard)/dashboard/page.tsx`, `dashboard-home.tsx`)
- Rebuild on `PageHeader` / `MetricCard` / `EmptyState` (page-primitives) and shadcn.
- KPIs from real queries: HOT now, New HOT (7d), Avg HOT score (latest per domain), Credits (usage bar). Show a Δ only when a prior period exists.
- Hero card: top 8 HOT or rising accounts (favicon, score via `<BandPill>`, top signal chips, a one-line reason from stored reasoning, "Open" → last score without rescoring (`/score?domain=x&view=last`, S17)).
- Real band trend: daily counts from `scores.created_at` (Recharts is already a dependency), with "trend appears after 3 days" as the fallback. Bound the unbounded `scores` query.
- First-run (0 accounts): a "Score your first company" input, 3 sample domains and a 3-step checklist.
- Demo seed script `scripts/seed-demo.ts`: scores ~30 domains for a given Clerk user id through `scoreCompany`, with `MOCK_SIGNALS` respected (run by the founder against prod with their own account).

---

## Verification
- `npm run lint`, `npx tsc --noEmit`, `npm test` after every step. Update the tests that assert on removed copy or controls (`nav.test.ts`, `route-access.test.ts`, typography, `score-motion`, `workspace.test.tsx`); add unit tests for `source-labels`, band helpers, the progress event emitter and the SSE route (mock `scoreCompany`).
- Run `MOCK_SIGNALS=true npm run dev`: curl every public page and grep that removed claims are gone (`SOC 2`, `Solo-built`, `Spring '26`, `HubSpot`, `99.97`).
- Browser screenshots are blocked in this sandbox (the proxy can't reach localhost from Chromium), so the founder should do a visual pass on the Vercel preview for this branch: the golden-path demo (Home → score a fresh domain → evidence → Draft outreach → Watchlist) in light and dark, plus 390 px mobile.
- Before the meeting: run the seed script on the demo account, and dry-run the live HOT domain twice (target under 15 s).

## Deferred (after the meeting)
B5 nav flatten; C1 token consolidation (47 font sizes → 7, 1,320 inline styles, splitting the 9.8k-line globals.css); flipping the default theme to light for the full Field-instrument look.
