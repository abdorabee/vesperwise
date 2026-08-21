# VesperWise — YC-Grade UI/UX Teardown

> Written from the lens of a skeptical YC partner + a design-minded technical co-founder.
> Goal: what a top-tier investor would notice in the product's UI/UX, ranked by leverage, so
> the app *looks fundable* — plus the specific, file-level fixes to get there.
>
> Method: multi-agent code + design review across activation, information architecture,
> marketing/positioning, visual system/accessibility, and monetization/trust. Live landing +
> auth and the static HTML prototypes were rendered for visual evidence. The authenticated
> dashboard could not be exercised end-to-end in this session (no Supabase / OpenRouter keys),
> so dashboard findings are code- and prototype-based.

---

## 0. TL;DR — the investor verdict

**The engine is fundable. The presentation is not — yet.**

VesperWise has a genuinely differentiated wedge: a single **0–100 buying-intent score** built from *time-bound, cited evidence* (funding, hiring, news, tech change) with **coverage-aware honesty** (unscorable = no charge) and a **mature credit/billing ledger**. That is real, defensible engineering that most pre-seed intent tools fake.

The problem is that **almost none of that quality reaches the screen**, and the marketing surface actively *undercuts* credibility:

- The **best trust UI in the repo (`components/score/score-result.tsx`) is dead code** — never imported. Users see a thinner score view that hides evidence, freshness, and coverage.
- The **landing page reads like a Series B vendor** (famous-brand "customers", fabricated testimonials, "2.4M accounts scored", "99.97% uptime", "SOC 2 Type II") while `/about` honestly says *solo founder, no team, no investors*. **Investors will believe `/about` and distrust everything else.**
- The **IA sprawls to 12 sidebar destinations** (four ways to score, four account containers, three activity feeds) — it signals *breadth before focus*, the opposite of a YC wedge.
- **First-run is inverted**: signup → mandatory chatbot ICP interview → empty analytics dashboard showing **0 credits** (an auth bug) and fake sparklines — before the user has scored anything.
- The **brand is half-renamed** (VesperWise vs IntentIQ) across nav, logo, emails, API URLs, and onboarding.

None of these are deep architectural problems. They are **surface, honesty, and focus** problems — which is exactly the category you can fix fast and which disproportionately moves investor perception.

**If you fix the ~7 items in [§6 Demo-Day Checklist](#6-demo-day-readiness-checklist), the same product goes from "polished prototype" to "credible, focused, and honest v1."**

---

## 1. What's genuinely strong (lead with these)

Investors reward evidence of hard, correct engineering and taste. VesperWise has it:

1. **The "one number + the reasoning next to it" wedge.** When the score result renders, the combination of score ring + band + four trigger axes + AI verdict + next action is a clear aha. This is the demo. (`app/(dashboard)/score/score-view.tsx`)
2. **Coverage-aware scoring integrity.** Unscorable domains return `charged: false`; partial coverage is labeled; freshness decays per-signal. This is a *trust moat* and a great diligence story. (`lib/scorer.ts`, `lib/score-service.ts`)
3. **Billing is Stripe/Linear-grade.** Burn rate, depletion projection, top-ups, per-feature ledger, atomic credit reservation with refunds. Unusually mature for the stage. (`app/(dashboard)/billing/*`, `components/billing/*`)
4. **Data-dense dark dashboard prototype.** The Linear-inspired dashboard (band semantics, mono numerics, signal-mix donut, tight tables) looks like a real product, not a template. (`IntentIQ Dashboard.html`)
5. **Honest, likeable founder story.** `/about` is authentic and fundable — *if the rest of the site stops contradicting it.*

<img src="/opt/cursor/artifacts/vw_proto_dashboard.png" alt="VesperWise dashboard prototype: dark, data-dense, HOT/WARM/COLD bands, signal-mix donut" width="720" />

---

## 2. Top risks a YC partner will flag in the first 5 minutes

| # | Risk | Why it kills trust | Severity |
|---|------|--------------------|----------|
| R1 | **Fabricated social proof** — "customers" (Roundwave, Northbeam, Halcyon…), matching testimonials, "2.4M accounts scored", "99.97% uptime", SOC 2 Type II | Reads as misleading in diligence; contradicts `/about` solo-founder truth | **P0** |
| R2 | **Best trust UI is dead code** (`score-result.tsx` never imported) | You built the differentiator and shipped the weaker view; process red flag | **P0** |
| R3 | **First score shows "0 credits"** on the Score page (`score/page.tsx` uses Supabase auth instead of Clerk `auth()`) | Free tier looks broken before first use | **P0** |
| R4 | **Empty analytics dashboard as first surface** with fake sparklines + non-functional range tabs | Day-0 user sees a hollow BI tool, not value | **P0** |
| R5 | **Unscorable/402/limit errors are red console text** with no recovery/upgrade path | Wastes peak-intent monetization + trust moments | **P0** |
| R6 | **12-item sidebar / scattered IA** (Score vs Bulk vs Analyze vs Pipeline; Watchlist vs Lists) | Signals no wedge; "building 6sense + Outreach + Clay at once" | **P0/P1** |
| R7 | **Plan promises ≠ enforced limits** (Autopilot 5/25/50 in marketing vs 5/20/50 in code; bulk 50 vs 100/1000) | Bait-and-switch risk; diligence and churn liability | **P0** |
| R8 | **Brand schizophrenia** (VesperWise vs IntentIQ) across shell, onboarding, emails, API URLs | Looks like a half-finished rebrand | **P1** |

---

## 3. Findings by dimension (evidence-backed)

Each finding cites the specific file/screen. Severity: **P0** = fix before any investor/customer sees it · **P1** = next sprint · **P2** = polish.

### 3.1 Activation & first-run (the make-or-break path)

Time-to-first-value today is **8–12 actions + forced delays** before a first score: `signup → /dashboard → onboarding gate → 4–7 turn AI chat → 2.5s redirect → empty dashboard → discover /score → type domain → wait`.

- **P0 — Onboarding ends on an empty dashboard, not the product.** Redirect to `/score?domain=stripe.com` (auto-score is already supported in `score-view.tsx`) or run a demo score inside onboarding. (`app/(dashboard)/onboarding/page.tsx`)
- **P0 — Mandatory ICP chatbot before any value.** For a "paste a domain" product this is inverted. Add "Skip — score first" with default ICP; collect the profile *after* the aha. (`components/onboarding-gate.tsx`)
- **P0 — Score page shows 0 credits.** `app/(dashboard)/score/page.tsx` uses `supabase.auth.getUser()` while every other page uses Clerk `auth()`; credits/recent always render empty. Match `watchlist/page.tsx`.
- **P0 — Empty dashboard is a power-user cockpit.** When `totalTracked === 0`, replace the KPI grid with a single hero: domain input + "Score your first account" + 3 example domains. Wire the orphaned `components/dashboard/quick-score.tsx`. (`components/dashboard/home/dashboard-home.tsx`)
- **P1 — Auth panel copy contradicts marketing.** Auth says "**6h** median time to first score"; hero says "**3 sec**". Pick one true number. (`app/(auth)/layout.tsx`)
- **P1 — Onboarding hard-depends on OpenRouter with no fallback** (scoring has a mock; onboarding doesn't) → first-run breaks if one env var is missing. (`app/api/onboarding/chat/route.ts`)
- **P1 — Hot-pick demo accounts are two clicks, not one.** Make a hot-pick click score immediately. (`score-view.tsx` `ScorePromptStage`)
- **P2 — Forced 1.5s + 2.5s delays, blank flash during gate redirect, mobile auth drops the trust panel.**

**Biggest activation risk:** mandatory chatbot → empty dashboard → "0 credits" before the user has done the one thing they came to do.

### 3.2 Information architecture & navigation

The IA does **not** tell a focused story. A clean narrative would be: **Score → Track → Act when HOT → Review.** Today's nav is 12 destinations wide.

- **P0 — Two account systems: Watchlist vs Lists.** Same mental model (accounts + segments) split across two top-level items. Merge under **Accounts** with segments as tabs. (`nav.tsx`, `watchlist/*`, `lists/*`)
- **P0 — Topbar HOT/WARM/COLD pills are always 0** (no `bandCounts` prop passed). Broken global wayfinding; wire it or remove. (`dashboard-shell.tsx`, `dashboard-topbar.tsx`)
- **P0 — Personalization moat (ICP/Memory) is hidden** — reachable only via ⌘K search, not the sidebar. Rename **Profile** and put it in the user menu. (`app/(dashboard)/memory`)
- **P1 — Four ways to score:** `/score`, `/bulk`, `/analyze` (dead redirect → `/dashboard`), and pipeline re-score. Collapse to one **Score** hub with *Single · Bulk · Recent* tabs; delete `/analyze`.
- **P1 — Three activity feeds:** Dashboard activity, `/history`, `/inbox`. Demote History under an **Activity** section.
- **P1 — "Soon" items are still clickable nav links** (Autopilot, API Keys), inviting users into empty rooms — even though the API-keys backend exists. Disable or ship.
- **P1 — Route/label mismatch:** `/pipeline` is labeled "Intent Hub". Pick one.
- **P1 — Nav, ⌘K search, and breadcrumbs are three different lists.** Generate all from one `NAV_CONFIG`.

**Recommended focused v1 nav:** `Home · Accounts · Intent Hub · Score · Activity` (+ Billing, + a collapsed Roadmap). Everything else becomes a tab, a deep link, or the user menu.

### 3.3 Marketing, positioning & pricing

<img src="/opt/cursor/artifacts/vw_landing_hero.png" alt="VesperWise landing hero: dark background, 'Pipeline intelligence for B2B sales teams' with lime accent" width="720" />

- **P0 — Fabricated customer logos.** "Powering pipelines at sales orgs you've heard of" → Roundwave, Signaltree, Meridian, Carbide, Northbeam, Halcyon. These are invented names; remove or relabel "Example / demo data". (`LandingPage.tsx` trust strip; `components/landing/LogoStrip.tsx`, `TrustStrip.tsx`)
- **P0 — Fabricated testimonials** that map 1:1 to the fake logos, *reused on the login/signup pages*. Delete or replace with a real, permissioned founder/beta quote. (`LandingPage.tsx`, `app/(auth)/layout.tsx`)
- **P0 — Unverifiable headline stats** for a v0.1: "2.4M accounts scored", "+38% HOT-band reply rate", "99.97% uptime". Replace with honest, auditable metrics.
- **P0 — Story conflict:** landing/contact/security project a mature enterprise vendor (5 support channels, 47-min median reply, SOC 2 Type II, Cairo + SF offices) while `/about` says solo, pre-seed. Unify to one true narrative; mark aspirational certs as "in progress".
- **P0 — Plan matrix disagrees with billing code** (Autopilot 5/50 vs 20/50; bulk sizes) — sign-up expectations won't match the app. Generate marketing cards from `lib/billing-plans.ts` / `PLAN_*`.
- **P1 — H1 category too broad.** "Pipeline intelligence" reads like Clari/Gong (forecasting). Lead with the wedge: *"Know which accounts are ready to buy — scored 0–100 from live intent signals."*
- **P1 — Dead `#` CTAs** ("Talk to sales", Agency, modular hero demo). Point to `/contact#contact-form` or `mailto:`.
- **P1 — Agency tier ($499 / 25k) is hidden** behind a dead link though it exists in code.
- **P1 — Integration grid over-claims** (Salesforce, HubSpot, Outreach, Zapier) — badge Available / Beta / Webhook-only.

**Suggested 1-line value prop:** *"VesperWise turns public buying signals — funding, hiring, news, and tech changes — into a single 0–100 intent score with AI reasoning and a next step, so SMB sales teams know which accounts to call today without a $50K intent platform."*

### 3.4 Visual system & accessibility

The dark, data-dense foundation is good and the acid-lime `#dfff00` is *not* inherently a WCAG problem (as a **fill with black text** it's ~18:1; as accent text on near-black ~17:1). The real issues are **token chaos** and a few contrast/mobile bugs.

- **P0 — Three competing token systems** (HTML prototypes say violet `#5e6ad2` + cyan; `DESIGN-DIRECTION.md` says violet; code ships lime `#dfff00` on `#000`). Side-by-side with the prototypes it will *never* match. Pick one canonical palette and update docs + prototypes to match (or revert code). See the split-brain in `IntentIQ Linear.html` (violet) vs the live lime landing.
- **P0 — `.btn-primary` can render as a ~12% translucent lime wash** with black text (effectively invisible) because `theme-overrides.css` sets `--accent` to a soft fill that `globals.css .btn-primary { background: var(--accent) }` consumes. Split `--brand-solid`/`--action-bg` from shadcn `--accent`.
- **P0 — Apple-layer radii overwrite the HTML scale** (`--r-md` 6px → 12px), silently breaking "match the HTML".
- **P1 — Tertiary/quaternary text fails AA** in the live theme (`#666` ≈ 3.7:1, `#4a4a4a` ≈ 2.4:1). Restore the prototype greys (`#8a8f98` / `#62666d`).
- **P1 — Band pills are hidden on phones** (`.topbar .band { display:none }` ≤640px) — core product language disappears on mobile with no substitute.
- **P1 — Color-blind risk:** brand lime and HOT green read as the same hue in charts/signals; add shape/icon redundancy.
- **P1 — `.band` and `.btn-primary` are each defined 3 different ways**; consolidate.
- **P2 — Loading states are text-only** ("Loading…") with no skeletons or `aria-live`; `intentiq.css` referenced by 7 prototypes is missing from the repo (why `IntentIQ Score.html` renders blank).

### 3.5 Monetization UX & score trust

- **P0 — No upgrade path on "insufficient credits" (402).** The API returns `credits_remaining`; the UI shows a red string. Add a modal: credits left, reset date, **Top up** + **Upgrade**. (`score-view.tsx`, `quick-score.tsx`)
- **P0 — Unscorable (422) is honest in the API, opaque in the UI.** Render an *Unscorable panel*: coverage %, per-signal status, missing/stale sources, and a **"No credit charged"** badge. (`score-view.tsx` `requireScorableResult()`)
- **P0 — Wire `ScoreResult`** (contributions, evidence URLs, partial banner, decay date) into the live score page — the differentiator is currently dead code.
- **P0 — Plan bullets oversell enforced limits** (see R7) — single source of truth + a CI check.
- **P1 — Cached results are labeled "Generated just now"** — misrepresents freshness. Show "Cached · scored 2h ago · free refresh" vs "Fresh · 1 credit". (`score-view.tsx` `OverviewBlock`)
- **P1 — Partial (<60% coverage) scores show no warning** on the primary page and shouldn't power one-click outreach.
- **P1 — Per-signal status (ok/stale/unavailable/no_signal) isn't shown** — users can't judge *why* a score is what it is.
- **P1 — Watchlist limit (403) is a dead-end error** at the perfect upgrade moment; watchlist add failures on the Score page are silently swallowed.
- **P2 — Credit economics are hidden** (chat costs 0.25; top-ups; cache free) — add a "What uses credits?" panel; warn the nav credit meter at ≤10%.
- **Positive:** Bulk failure handling and the Billing page are the quality bar — replicate them on Score and inline paywalls.

---

## 4. Severity rollup

| Priority | Count (approx) | Dominant themes |
|----------|----------------|-----------------|
| **P0** | ~15 | Fabricated proof; dead trust UI; broken first-run credits; empty first surface; no upgrade/unscorable UX; plan-vs-code drift; token chaos |
| **P1** | ~25 | IA sprawl; copy contradictions; freshness honesty; contrast; mobile band loss; brand rename; dead CTAs |
| **P2** | ~20 | Skeletons/`aria-live`; nav chevrons; breadcrumbs; credit explainers; polish |

---

## 5. The narrative you want investors to see

> **Score → Track → Act when HOT → Review.**
> One sharp wedge (cited, coverage-aware intent scoring for SMB sales), one honest story
> (early-stage, real product, real founder), one coherent surface (5-item nav, one brand,
> the reasoning shown next to the number).

Everything in §3 is in service of that sentence. The current build says "we can build anything"; the funded version says "we do one thing, provably, and we're honest about where we are."

---

## 6. Demo-Day readiness checklist (highest leverage, in order)

These ~7 fixes convert the most investor skepticism per unit of effort:

1. **Purge fabricated proof.** Remove fake logos, testimonials, and inflated stats from the landing *and* auth pages. Replace with honest metrics + one real quote (or none). Unify the site story with `/about`. *(R1, §3.3)*
2. **Ship the real score view.** Wire `components/score/score-result.tsx` (or port its evidence/coverage/partial blocks) into `/score`. This is the demo. *(R2, §3.5)*
3. **Fix first-run.** Correct the Clerk-auth bug on `score/page.tsx` (0 credits → 20); route onboarding to an auto-run first score; give the empty dashboard a single "Score your first account" hero. *(R3/R4, §3.1)*
4. **Make peak-intent moments monetize, honestly.** 402 → upgrade/top-up modal; 422 → unscorable panel with "no credit charged"; cached vs fresh labeled truthfully. *(R5, §3.5)*
5. **Collapse the nav to a wedge.** `Home · Accounts · Intent Hub · Score · Activity`; delete `/analyze`; disable "Soon" links; put Profile in the user menu. *(R6, §3.2)*
6. **One source of truth for plans.** Generate marketing + billing cards from `PLAN_*` / `billing-plans.ts`; add a CI check. *(R7, §3.3/§3.5)*
7. **Finish the brand + pick one palette.** Global VesperWise pass (logo, emails, API URLs, onboarding header); choose lime *or* violet and reconcile prototypes/docs/code, fixing the `.btn-primary` token bug and mobile band visibility. *(R8, §3.4)*

Do these seven and the product photographs as a focused, credible, honest v1 — which is exactly what a YC partner is underwriting at this stage.

---

## Appendix — evidence captured this session

- `vw_landing_hero.png` — live landing hero (dark + acid-lime, "Pipeline intelligence" H1)
- `vw_landing_pricing.png` — testimonials + "Start free. Pay when you close." pricing
- `vw_login.png` — split auth screen (rotating stats panel + Clerk form)
- `vw_proto_dashboard.png` — dense dark dashboard prototype (bands, signal-mix donut)
- `vw_proto_landing.png` — `IntentIQ Linear.html` (the earlier **violet** design intent)
- `vw_proto_score.png` — `IntentIQ Score.html` (renders blank locally — missing `intentiq.css`)

*Note:* the authenticated dashboard was not exercised end-to-end (no Supabase/OpenRouter keys in this environment); those findings are code/prototype-based. Clerk ran in keyless dev mode, so the landing and login rendered live.
