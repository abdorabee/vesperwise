# 04 — Core scoring flow audit (Score · History · Watchlist)

Audited from source only (pages are behind Clerk auth). Skills applied: better-ui, emil-design-eng, interaction-design, dataviz (palette validator run), ui-ux-pro-max.
Files: `app/(dashboard)/score/*`, `app/(dashboard)/history/*`, `app/(dashboard)/watchlist/*`, `app/(dashboard)/analyze/page.tsx` (only redirects to `/dashboard`), `components/score/**`, `components/watchlist/*`, `components/ai-elements/*`, plus `lib/gen-ui.ts`, `lib/signals/mock.ts`, `lib/score-service.ts`, `app/globals.css`.

---

## 1. Verdict: 5 / 10 for a demo

The score page is honest, calm and well built: dated evidence, a real "coverage incomplete" state, context signals marked "excluded from score", and restrained motion. For an investor who judges on UI, though, the key moment falls flat:

- **Waiting.** A 5–25 s live request shows one static sentence and a skeleton.
- **The score.** It is a black `82` next to a **grey** `HOT` chip. Nothing shows magnitude, colour or momentum.
- **The evidence.** It reads as raw provider ids (`2026-09-27 · scrapling`, or `· mock` with "— MOCK" in every sentence under mock mode). There are no links.
- **The submit button.** Its arrow is white on lime, about 1.1:1 contrast, so it is effectively invisible.
- **History and Watchlist.** They use a different visual language (inline styles, green HOT) from the Score page (neutral shadcn). They also contain several buttons that do nothing: Sort, Filter, Stage, the range tabs, and Favorite.

The foundations are good, but the product doesn't impress yet. Most of the fixes are S/M effort.

---

## 2. What's already good

- **Honest partial-coverage state.** `components/score/score-coverage-incomplete.tsx` says "We couldn't calculate a reliable score… Missing coverage is not treated as a zero", shows a per-signal status, "No credit charged", and offers Retry and Score-another. This is a real trust asset: show it deliberately in the demo.
- **Evidence-first table.** `gen-ui/workspace.tsx:57-81` splits trigger signals from "Supporting context · excluded from score". Showing how the score is built like this is uncommon and credible.
- **Skeleton that mirrors the result.** `score-research-status.tsx:10-15` uses the same 3-column grid as the result table, so there is no layout jump.
- **Motion discipline.** One easing token (`cubic-bezier(0.22,1,0.36,1)`), 200–240 ms entries, a 60–70 ms row stagger, and a full `prefers-reduced-motion` fallback (`globals.css:7721-7835`). This matches the emil and better-ui guidance.
- **Thread model.** Earlier artifacts collapse into `<details>` summaries (`score-view.tsx:100-111`). Follow-ups and suggestion chips ("Why HOT?", "Draft outreach", "Who to call") make it feel like a copilot. The editable outreach draft with Copy/Refine is a strong second beat.
- **Cost transparency.** "1 credit", "cache hit · free", and "Fresh scores use 1 credit" are shown.
- **History's data.** Delta vs previous run, band chips with counts, a 30-day stacked activity strip, CSV export, and a detail drawer with the talk track.
- **Watchlist concept.** A threshold bar with a 75 marker, a "crossed HOT" alert strip with Review now, and quick-add by domain.

---

## 3. Findings

| ID | Sev | What the investor sees | Evidence (file:line) | Concrete fix | Effort |
|---|---|---|---|---|---|
| S1 | **P0** | The primary "Score" button is a lime pill with an invisible arrow. Every default `<Button>` in dark mode has white text on lime. | `globals.css:110-111` (`--primary:#dfff00; --primary-foreground:#ffffff`) overrides `.score-elements-submit` at `globals.css:7757-7761`. `components/ui/button.tsx:12` | Set `--primary-foreground:#08090a` in `.dark`. Contrast goes from about 1.1:1 to about 17:1. | S |
| S2 | **P0** | In mock mode every evidence line ends in "— MOCK" and the source column reads `· mock`. In live mode it reads `· scrapling` / `· explorium-events` / `· open-page-rank`, which are internal tool names. | `lib/signals/mock.ts:64-128`; `gen-ui/workspace.tsx:41` renders `axis.source` raw | Map provider ids to human labels ("Company newsroom", "Job boards", "Crunchbase-class funding data", "BuiltWith"). Strip " — MOCK" in UI and show one discreet "Sample data" pill on the card instead. For the demo, use pre-warmed live scores (see §5). | S |
| S3 | **P0** | The wait is one static line, "Verifying current signals and source dates…", with a pulsing dot for 5–25 s. The live path runs 4–6 providers with 5–12 s timeouts, then the LLM with a 12 s timeout. The "Using …" tool line never appears for scores because `runScore` is a plain `fetch` with no events. | `score-research-status.tsx:8`; `score-view.tsx:152-157, 280-282`; `lib/score-service.ts:477, 602`; `lib/reasoning.ts:156` | Stream real progress over SSE from `scoreCompany`. The service already resolves each signal in its own `Promise.all` callback (`score-service.ts:602`), so emit `signal_done {key,status,detail,observed_at}` as each lands, then `reasoning_start` and `reasoning_done`. Fill skeleton rows in place as each provider returns ("Funding · checked · Series B · 42 d ago ✓"), then type in the thesis. This respects the existing test contract that bans fake timed steps (`score-motion.test.ts:9`), because the progress is real. | M |
| S4 | **P0** | The score is not instantly readable. It is a 4xl neutral number with a `variant="secondary"` grey HOT badge, so HOT, WARM and COLD look identical. Nothing shows where 82 sits on 0–100 or against the 50/75 thresholds. | `gen-ui/workspace.tsx:17-30` | Put a band-coloured hero on the left: a 56–64 px tabular number with "/100" muted, a coloured band pill with icon and label (`--hot`, `--warm` and `--cold` tokens already exist, `globals.css:535-543`), and a thin horizontal 0–100 meter with tick marks at 50 and 75 and a marker at the score. Add one line under it: "Act this week · Decision stage". Band colour must always come with a text label, never colour alone. | S |
| S5 | P1 | `buying_stage`, `urgency` and `icp_fit_score` are computed and passed into the hero block but never rendered. The richest "so what" data is thrown away. | `lib/gen-ui.ts:172-176` vs `gen-ui/workspace.tsx:17-30` | Render "Urgency: act-now" as the headline chip, plus Stage and ICP fit (xx/100) as a secondary meta row. | S |
| S6 | P1 | Evidence has no clickable sources. Dates are raw ISO slices (`2026-09-27`). Source URLs exist in the payload (`SignalEvidence.source_url`, `SignalContribution.sourceUrls`) but are dropped. | `lib/types.ts:17,86`; `lib/gen-ui.ts:110-127` drops `evidence`; `workspace.tsx:41` | Carry `evidence[0].source_url` and `freshness`/`daysAgo` into `SignalAxis`. Render "42 days ago · Company newsroom ↗" with a favicon, and show the absolute date in a tooltip. Add a "Fetched 2 min ago" freshness stamp in the card header from `last_updated`. | S–M |
| S7 | P1 | The "Current read" column shows `12 / 20`, but the user can't see how much each signal moved the final score. `contributions[]` (effectiveWeight, decay, contribution) exists but is not shown. | `lib/types.ts:69-87,113`; `workspace.tsx:45` | Replace the text `12 / 20` with a small horizontal bar (4 px radius end, neutral track) plus "+18 pts" contribution. Sort rows by contribution. Mark decay: "news · 38 d old · −22% freshness". Per dataviz, use one hue for magnitude and keep labels in text ink. | M |
| S8 | P1 | The AI thesis is visually equal to the table and sits *below* the evidence, so the "so what" is buried under a 6-row table. The recommended action is a 2 px left border. | `workspace.tsx:83-91`; block order in `lib/gen-ui.ts:165-221` | Reorder to hero, then a "Why now" line (1–2 sentences, larger 15–16 px), then a Recommended next move callout (lime-tinted surface, icon, primary CTA "Draft outreach"), then evidence. Collapse Supporting context by default. | S |
| S9 | P1 | `recentScores` is queried on every Score page load and never rendered. The entry screen is a lone mascot and input, with no proof that the product has been used. | `score/page.tsx:16-27`; `score-view.tsx:33,114` (prop ignored) | Under the composer on the empty state, render "Recent" as 3–6 compact rows: favicon · company · score · band pill · "2 d ago", each clickable to restore without rescoring. | S |
| S10 | P1 | Typing a company name ("Stripe") instead of a domain is silently sent to chat. It costs 0.25 credit and returns prose, not a score. The placeholder says "Enter a company domain", but the API accepts `company`. | `lib/chat-client.ts:15-27`; `score-view.tsx:226-232`; `lib/types.ts:303` | On the first message, when there is no session, treat a single token or short phrase as a company lookup. Resolve it to a domain with a confirm chip ("Did you mean stripe.com?"), or call `/api/v1/score` with `{company}`. | S–M |
| S11 | P1 | The error state is red text with no next step. Insufficient credits (402) shows the raw message and no Upgrade/Top-up CTA. The 409 "score in progress" shows the raw message. | `score-view.tsx:279`; `app/api/v1/score/route.ts:128-143` | Add a typed error card for each code: 402 shows credits left, "Top up" and "See plans"; 409 auto-retries after `retry_after_seconds`; 500 shows Retry plus "Score another company". | S |
| S12 | P1 | History has five controls that look clickable but do nothing: the range tabs 24H/7D/30D/90D/All (30D is hard-coded active), "Stage", "Filter", "Sort: Newest", and the row "⋯". An investor who clicks one sees a broken app. | `history/history-view.tsx:438-443, 546-555, 632-634` | Either wire them (range → query param; sort by score/Δ/date with `aria-sort`) or remove them for the demo. At minimum: sort by Score, sort by Δ, and range. | S (remove) / M (wire) |
| S13 | P1 | History search fires a network request on every keystroke with no abort, so results can arrive out of order and flash. Loading is plain "Loading…" text. | `history-view.tsx:319-335, 344, 558-559` | 250 ms debounce plus an `AbortController`. Use skeleton rows at the table's row height. | S |
| S14 | P1 | Three visual languages sit side by side. The Score page is neutral shadcn (grey band badge). History and Watchlist use inline styles, hard-coded `rgba(255,255,255,…)`, mono fonts, green HOT and glow dots. The retired `ScoreResultCard` (516 lines, ring and radar) is unused but still in the tree. | `history-view.tsx` (roughly 150 inline `style=` objects); `watchlist-table.tsx`; `components/score/score-result-card.tsx` (no importers except a typography test) | Extract one `<BandPill>`, one `<ScoreNumber>` and one `<ScoreMeter>`, and use them on all three pages. Delete the dead `score-result-card.tsx`. Move History onto shadcn `Table` and tokens. | M |
| S15 | P1 | Watchlist "Signal mix" colours funding `#dfff00` and technology `#e8ff40` are indistinguishable. The validator reports normal-vision ΔE 2.3 (floor 15) and protan ΔE 0.4. The whole 5-slot palette FAILs the lightness band and chroma floor. There is no legend or tooltip on the mix bars. | `lib/watchlist-stats.ts:53-57`; `watchlist-table.tsx:124-132` | Re-step to a validated categorical palette (run `validate_palette.js`). Add a hover tooltip per segment ("Funding 18/25") and a one-line legend in the header. | S |
| S16 | P1 | The watchlist "⋯" (more) icon deletes the account immediately, with no confirm and no undo. The star "Favorite" button is a no-op. Row checkboxes select, but no bulk action bar ever appears. | `watchlist-table.tsx:158-185, 79-93` | Make "⋯" open a menu (Rescore, Open last score, Remove), and give Remove an undo toast. Hide the star until it works. Show a sticky bulk bar ("3 selected · Rescore · Remove") when the selection is non-empty. | S–M |
| S17 | P1 | Clicking a watchlist row, a History "Re-score" button, or the alert's "Review now" all go to `/score?domain=…`, which **auto-runs a new score** (`score-view.tsx:133-139`). Users can't view the last result without spending or waiting. | `watchlist-table.tsx:72`; `watchlist-view.tsx:167`; `history-view.tsx:630` | Add `/score?domain=x&view=last` (or a score id) that restores the stored result instantly, with an explicit "Rescore (1 credit)" button. | M |
| S18 | P2 | Watchlist column header is fixed as "7d trend" even when range = 30D. The subtitle renders "last refresh never ago" or "now ago". | `watchlist-table.tsx:55`; `watchlist-page-head.tsx:16-30` with `lib/watchlist-stats.ts:83-95` | Use `{range} trend`. Build the whole phrase in one formatter ("refreshed 3 h ago" / "not yet refreshed"). | S |
| S19 | P2 | The watchlist empty state is a single footer line, "No accounts on your watchlist". | `watchlist-table.tsx:39-47` | Use an empty state with a value line ("Get alerted the day an account crosses HOT"), 3 one-click suggested domains, and focus on quick-add. | S |
| S20 | P2 | On mobile (≤640 px) the evidence table is forced to `min-width:42rem`, so it scrolls horizontally inside the thread. | `globals.css:7818` | Below `sm`, render each signal as a stacked row: label and bar on line 1, detail on line 2, date·source on line 3. | S |
| S21 | P2 | The score hero has no company identity: no logo or favicon, only the name and domain. History and Watchlist use coloured initial avatars. | `workspace.tsx:21-24`; `history-view.tsx:595` | Use a favicon (`https://icons.duckduckgo.com/ip3/{domain}.ico` or a stored logo), with an initial-avatar fallback. | S |
| S22 | P2 | History band chips and pagination are `<span>`/`<div onClick>`, not buttons: not keyboard reachable, and there is no focus ring. The drawer has Esc but no focus trap. | `history-view.tsx:541, 669-673, 694` | Use `<button>` or shadcn `Toggle`/`Pagination`. Use the shadcn `Sheet` for the drawer, as `score-thread-drawer.tsx` already does. | S |
| S23 | P2 | "Open account ↗" opens a LinkedIn *search* results page, not the company. That is weak for a demo. | `workspace.tsx:119` | Rename it "Find on LinkedIn", or link the company site and the top evidence URL. | S |
| S24 | P2 | Light-mode `--primary` is violet (`oklch(0.52 0.18 277)`), not brand lime. This is only visible if someone switches theme. | `globals.css:73` | Keep the app dark-only for the demo, or map light `--primary` to a lime-derived accessible token. | S |
| S25 | P2 | There is no score-reveal moment. The whole artifact fades in at 240 ms; the number doesn't count up and the band doesn't land. | `globals.css:7767-7782` | Once per fresh score (not on restore), count the number up over 600 ms with `ease-out`, then fade in the band pill with a blur(4px)→0 at 150 ms. Skip under reduced motion. This is a rare, high-value moment, so delight is appropriate here per emil's frequency table. | S |

---

## 4. Top 3 highest-leverage changes

1. **Make the wait show the real work (S3, plus S25).** Stream real per-provider completions into the skeleton rows: "Funding ✓ Series B · 42 d ago", "Hiring ✓ 6 roles", "News ⟳ checking…", "Tech — no change", then "Synthesising why-now…". Finish with a counted-up number and the band landing. This one change turns 10–20 s of dead air into the product's best moment, and it stays honest (no fake steps).
2. **Rebuild the result hero for 1-second legibility (S4, S5, S8, S21, S1).** Show logo · company · big band-coloured number · 0–100 meter with 50/75 ticks · "HOT · Act this week · Decision stage · ICP 81". Directly underneath put Why now (2 lines) and a Recommended next move with a primary "Draft outreach" CTA, then evidence. Fix the lime/white contrast so the CTA is readable.
3. **Make the evidence trustworthy (S2, S6, S7).** Use human source names, relative dates ("42 days ago"), a clickable source ↗ per row, a contribution bar with "+18 pts" per signal, and a "Fetched 2 min ago" freshness stamp. Never show "MOCK" or `scrapling` on screen.

(Close runner-up: remove or wire every dead control in History and Watchlist (S12, S16) before the demo. Each costs little, and one dead click hurts the investor's impression a lot.)

---

## 5. Golden-path demo script

**Before the demo:** Use `MOCK_SIGNALS=false` with real keys. Pick 3 domains that are known to be HOT, WARM and COLD, and pre-score them the day before so History and Watchlist have data (at least 12 History rows across 2+ days, deltas, and one account that "crossed HOT"). Choose one **fresh** HOT domain that is *not* cached for the live moment, and dry-run it twice that morning to check latency (under 15 s) and coverage (at least 3 of 4). Keep credits above 50. Log in beforehand; don't sign up live.

1. **Score page empty state.** "This is the only input a rep needs." Show Recent scores under the composer (S9), and the credits line. *Must be true:* S1 fixed (visible submit arrow), recent list populated.
2. **Type `<fresh-hot-domain>.com` and press Enter.** Narrate while rows fill in live: "It's checking funding, hiring, news and tech-stack changes right now, each with a date." *Must be true:* S3 streaming. If S3 isn't shipped, use a domain that returns in under 6 s and talk over it.
3. **Result lands.** Count-up to 84, the HOT pill turns green, "Act this week". "One number, one band, one next move." Point at the Why now line and the Recommended next move. *Must be true:* S4, S5, S8; no grey badge.
4. **Evidence.** Hover the Funding row: "Series B, 42 days ago", click the source ↗. Point at "Supporting context · excluded from score": "We don't inflate scores with vanity metrics." *Must be true:* S2 (no MOCK or vendor ids) and S6 (links).
5. **Click the "Draft outreach" suggestion chip,** then edit a line and Copy. "From signal to first touch in 30 seconds."
6. **Save to watchlist, then open Watchlist.** Show the alert strip "2 accounts crossed your HOT threshold", the threshold bars, and the trend. *Must be true:* S15 palette, S16 (no instant delete on the "⋯" icon), S17 (row opens the last score without rescoring).
7. **(Optional) History.** Band filter HOT, the Δ column, Export CSV. *Must be true:* S12 (no dead Sort/Filter/range buttons, or they are removed).

Backup beat: if a live domain comes back thin, lean into it. The "We couldn't calculate a reliable score · No credit charged" card is a credibility story ("we refuse to guess").

---

## 6. Ideal score result view (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [logo] Acme Robotics                                   Fetched 2 min ago · ↻ │
│        acme.io · Series B · 180 employees                                    │
│                                                                              │
│   84 /100   ● HOT     Act this week · Decision stage · ICP fit 81            │
│   ├──────────────────────────────┼──────────────┼────────────●──────┤        │
│   0                              50 WARM        75 HOT       84   100        │
├──────────────────────────────────────────────────────────────────────────────┤
│ WHY NOW                                                                      │
│ Closed a $22M Series B 6 weeks ago and is hiring 6 RevOps/Sales roles while  │
│ migrating CRM, so the budget and the pain are live at the same time.         │
│                                                                              │
│ ┃ RECOMMENDED NEXT MOVE                                                      │
│ ┃ Reach the new VP RevOps this week with a CRM-migration angle.              │
│ ┃ [ Draft outreach ]   [ Who to call ]   [ ☆ Watch ]                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ EVIDENCE  4 of 4 signals verified · 92% coverage                             │
│ Funding   ████████████████░░░  +21  Series B $22M       42 d ago · Newsroom ↗│
│ Hiring    ██████████████░░░░░  +17  6 Sales/RevOps roles 10 d ago · Jobs ↗  │
│ Tech      ████████████░░░░░░░  +15  Salesforce → HubSpot 30 d ago · BuiltW ↗│
│ News      ██████████░░░░░░░░░  +12  New CEO, launch      38 d ago · News ↗  │
│                                         (decayed −22% for age)               │
│ ▸ Supporting context (excluded from score): Web authority, GitHub activity   │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1 credit · scored with v3-five-signal · [Why HOT?] [Compare with …]          │
└──────────────────────────────────────────────────────────────────────────────┘
 Loading state = the same frame. Evidence rows fill one by one as providers
 return (⟳ checking… → ✓ / — none found), then Why now streams in and the
 number counts up last.
```

---

## 7. Design references that fit

- **Perplexity / ChatGPT deep-research step list.** Real, streaming source checks with favicons and "Reading 4 sources" before the answer. This is the model for S3.
- **Stripe Radar risk score.** A single 0–100 score, a band colour, and "Top factors that increased the score" with a contribution per factor. This is the model for S4 and S7.
- **Clay enrichment waterfall.** Per-provider cells turning from pending to found or not found, which makes data coverage visible and satisfying.
- **Linear Insights / Linear issue view.** Dark, dense, restrained type. It matches the existing tokens and is the target for unifying History and Watchlist (S14).
- **Vercel deployment page.** A live build log that collapses into a clean summary card with status and timestamps. It shows how to go from "working" to "done" without a spinner.
- **6sense / Bombora intent views.** An intent stage plus urgency chip treatment, but lighter. Useful as the category comparison an investor will have in mind; VesperWise wins by showing evidence with dates.
- **Raycast AI / Arc "Browse for me".** The answer card leads with the next action and citations underneath.
