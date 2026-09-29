# 07 — Reference board (design research)

Date: 2026-09-29. Scope: read-only research; nothing in the repo was edited.

## Method and limits

- **WebFetch was blocked by the sandbox egress proxy** for every product site tried (`getkoala.com`, `attio.com`, `linear.app`). I did not try to bypass it. **WebSearch worked**, so the market facts below come from search results. The visual notes on each product come from my own knowledge (cutoff mid-2026), **so check every screen before copying it.**
- `ui-ux-pro-max` loaded, but its `scripts/search.py` and CSV databases are **not installed**. The synced folder holds only `SKILL.md`. So I used its quick-reference rules (tabular numbers, color-not-only, one primary CTA per screen, skeleton loading, table sorting with `aria-sort`). I could not query the palette or product-type database.
- `frontend-design` flags "near-black background with a single bright acid-green accent" as one of the **five most common AI-generated looks**. It also flags gradient washes, grid overlays, "Spring '26"-style eyebrow badges, and the `·`-joined meta line. **The current VesperWise landing page has all of these.** It uses `#08090a`, a lime gradient `<h1>`, `grid-overlay`, `hero-screen-glow`, and `hero-meta` "20 free credits · No credit card · …". The dark palette variables also carry a stale comment, "Linear-style violet". This is the single biggest reason it reads as templated rather than funded.

### Market context worth knowing before the investor meeting (from search, 2026)

- **Koala was acquired by Cursor (Anysphere) in July 2025 and shut down on 2025-09-30.** Its 0–100 intent score with "heating/surging" momentum is the closest analogue to VesperWise. That UI pattern now has no owner.
- **HubSpot acquired Warmly (June 2026).** **Zoom agreed to acquire Common Room (July 2, 2026).** **Apollo bought Pocus (March 2026).** Clari and Salesloft merged (Dec 2025). Signal-based GTM is consolidating into big platforms, which is an investor story in itself. Showing a UI that looks like it belongs in that tier matters.
- **Clay** shipped Sculptor (a natural-language workflow builder) in early 2026 and redesigned its sidebar and navigation in June 2026. **Unify 2.0** centers "Plays" and AI agents, plus a natural-language "Infinity Signal".

## Reference table

| Product | URL | What to steal | Applies to VesperWise screen |
|---|---|---|---|
| **Koala** (defunct, see screenshots via G2 / reviews) | getkoala.com (dead) · g2.com/products/koala/reviews | 0–100 intent score with a **momentum label** ("heating", "surging") next to the number. The trend matters more than the absolute value. The account row shows a score, a delta and the last signal in one line. | Score result, Watchlist rows, Dashboard "movers" |
| **Common Room** | commonroom.io | Person plus account **signal feed**: a vertical, source-iconed activity stream grouped by day, with each signal linked to its evidence. Signal-source logos act as trust markers. | Account page signal timeline, People |
| **Unify** | unifygtm.com | "Plays" framed as **if-signal-then-action** cards, and a warm, editorial marketing site with real product crops instead of mock gradients. | Autopilot, Recommended action block |
| **Warmly** | warmly.ai | Live, real-time "who's on your site now" ticker energy. Use it as one live element on the landing page, not everywhere. | Landing hero live module, Inbox |
| **Apollo.io** | apollo.io | Dense, filter-left **data table** with saved views, bulk-action bar on selection, and column chooser. The benchmark buyers already know. | Lists, Bulk results, People |
| **Clay** | clay.com | Spreadsheet-grade table with **per-cell enrichment status** (spinner, then value, then provenance on hover), plus a playful but disciplined brand (illustration used only on marketing, never in-app). | Bulk scoring progress, Lists |
| **6sense** | 6sense.com | Buying-stage language (Awareness, then Decision) as a **stage ribbon** above the score. Translates a number into a sales motion. | Score result header, Pipeline |
| **ZoomInfo** | zoominfo.com | "Scoops" and intent topics shown as **chips with a recency date**, and a firmographic header card (logo, HQ, headcount, funding) that makes an account page feel authoritative. | Account header |
| **Linear** | linear.app, linear.app/changelog, linear.app/method | Inter Display-style tight headings, 13px dense UI, **⌘K command palette**, keyboard hints in menus, and a changelog of dated entries with one hero image or video each. The product-shot hero is a real UI with a perspective tilt and fade, not a mock. | App shell, ⌘K, Changelog page, Landing hero |
| **Attio** | attio.com | The **record page**: an attribute sidebar on the left, a tabbed activity/notes/emails pane on the right, and inline editable fields. The best CRM-object layout to copy for an account page. Its light-first marketing site with crisp product crops reads as "expensive". | Account page, People detail |
| **Vercel** | vercel.com, vercel.com/geist | The Geist type and color system (a 10-step gray scale, with the accent rarely used), **empty states with a one-line CTA**, and a deploy-log style timeline with monospace timestamps. | Design tokens, Empty states, Bulk job log |
| **Resend** | resend.com | A dark hero with a **3D or rendered object** plus restrained serif/sans pairing. Docs-quality code blocks on the landing page ("score via API in 3 lines"). | Landing API section, API keys page |
| **Raycast** | raycast.com | Command-palette-as-hero, **keyboard-first UI screenshots**, and a bright accent used on about 2% of pixels (glows and focus only). Store-style extension grid. | ⌘K, Integrations page |
| **Height** (sunset in 2025, reference via archives or galleries) | height.app | Chat-plus-task side panel, and AI "copilot" suggestions inline in lists. | Chat copilot, Inbox |
| **Cal.com** | cal.com | Open-source-grade **light UI** with heavy gray and black, and a marketing page built from actual product components, which makes the site and the app feel like one product. | Landing, Settings, Billing |
| **Supabase** (green accent) | supabase.com | Keeps a neon green classy: **green only for brand mark, primary button and active states**. Everything else is a neutral scale. Dark by default, and the light mode is equally finished. | Accent usage rules |
| **Clerk** | clerk.com | Purple accent on a light, airy page, with components shown as **floating real widgets** (sign-in card) in the hero. The polish benchmark for auth screens. | Login/Signup, Onboarding |
| **Tremor / Vercel** | tremor.so (free and OSS since the Vercel acquisition, Jan 2025) | KPI card with sparkline, **Tracker** (status bars per day), BarList, CategoryBar, and a donut/progress circle. Built on Recharts, Tailwind-native. | KPI tiles, Signal-breakdown bars, Score gauge |
| **shadcn/ui charts + blocks** | ui.shadcn.com/charts, ui.shadcn.com/blocks | Radial chart ("radial-text" / "radial-shape"), which is the fastest route to a **0–100 score gauge**. The `dashboard-01` block (sidebar, KPI cards, area chart, data table) and `sidebar-07` (collapsible icon sidebar). | Score gauge, App shell, Dashboard |
| **COSS (formerly Origin UI)** | coss.com/ui (github.com/shadcn/originui) | **Timeline** components (vertical with icons and dates), advanced table (sort, filter, resize, pagination on TanStack), and number/stepper inputs. Rebranded in 2026 and moved onto Base UI. | Signal timeline, Lists table |
| **Magic UI** | magicui.design | `NumberTicker` (score count-up), `BorderBeam` (one highlighted hero card), `Marquee` (logo wall), `Safari`/`Iphone` device frames for product shots. **Use at most 2.** | Landing hero, Score reveal |
| **Aceternity UI** | ui.aceternity.com | `ContainerScroll` / "Macbook scroll" hero product-shot reveal, and `Spotlight`. Heavy, so pick one for the landing page only. | Landing hero product shot |
| **Saaspo** | saaspo.com, including /page-types/saas-landing-page-examples | Filter by "Sales" or "AI" category and by page type "Pricing" and "Hero". | Landing, Pricing |
| **Mobbin** | mobbin.com, web apps: Attio, Linear, Apollo, Clay, Vercel | Flows for "Onboarding", "Empty state", "Command palette", "Data table filter", and "Record detail". | All app screens |
| **Refero** | refero.design | Search "score", "gauge", "activity feed", "CRM record". Real in-product screenshots with good tagging. | Account page, Dashboard |
| **SaaSUI / SaaSFrame** | saasui.design, saasframe.io/categories/landing-page | Dashboard-screen-level gallery (SaaSUI) and 288 landing examples (SaaSFrame). | Dashboard |
| **Godly / Land-book** | godly.website, land-book.com | Filter by "dark" and "SaaS". Use for hero motion and type ideas only, not layout. | Landing hero |

## Recommended direction

**"Field instrument": light-first, precise, and lime as a highlighter, not a glow.** Stop fighting for attention in dark mode, where every Linear clone lives. Make the default surface a cool off-white (for example `#F7F8F6`), with ink-black type (`#0E1111`) and a proper 10-step neutral scale, Geist/Attio-style. Treat `#DFFF00` the way a sales rep uses a highlighter pen. It marks only what is **hot**: the HOT band, the score arc fill, the active nav marker, the single primary CTA, and highlighted evidence text. That is roughly 2–3% of pixels, and it is never used as body text on white (its contrast is too low). Pair it with ink so lime always sits under or behind dark text. Typography: keep Instrument Sans for UI, add one characterful display face for headings (for example a condensed grotesk such as "Instrument Sans Condensed" or "Geist" at tight tracking), and use tabular figures everywhere a number appears. The hero shows a **real account page** (score gauge, signal timeline, AI summary) cropped at an angle, with nothing else. Remove the gradient headline, grid overlay, glow and mascot from the hero. Dark mode stays fully supported and equally finished (Supabase-style), just not the first impression.

**Alternative A: "Dark terminal, done properly".** Keep dark as the default but earn it the way Raycast and Resend do. Use a warmer graphite (`#141513`) instead of near-black, one rendered or 3D object in the hero (a lime-lit "signal instrument"), and a heavier use of keyboard/⌘K motifs. Lime appears only on focus, the HOT band and the CTA. This is lower effort from the current state, but it stays closer to the "AI-generated" cluster.

**Alternative B: "Editorial intelligence brief".** Present each account as a one-page analyst memo: a serif display face for company names, an AI summary set like a pull quote, signals as footnoted evidence, and lime used as a margin highlight. It is the most differentiated option and fits "AI reasoning" well, but it is the riskiest for data-dense screens (Lists, Bulk) and needs a second, denser sub-style.

## 5 patterns to steal first (highest investor-demo impact per hour)

1. **Score gauge plus momentum (Koala × shadcn radial chart).** Show a 270° radial arc with the number in large tabular type, the band label with an icon (not just color), and a **delta chip** ("▲ 12 in 30d, heating"). Use shadcn `chart-radial-text` for the arc and Magic UI `NumberTicker` for a single count-up on first reveal (respect `prefers-reduced-motion`). Screens: Score result, Account header.
2. **Attio-style account record page.** Left column: firmographic header (logo, domain, HQ, headcount, last funding) plus attribute list. Right column: tabs for Signals, AI summary, People and Activity. The signal tab is a **COSS/Origin vertical timeline**: source icon, date, one-line evidence, link out. The AI summary sits in a bordered "brief" card with the recommended action as the single lime CTA.
3. **Linear-grade ⌘K palette plus keyboard hints.** Use shadcn `Command` in a dialog, with actions such as "Score a domain…", "Go to Watchlist", "Add to list", and recent accounts. Show `⌘K` in the top bar and `G then W`-style hints in menus. It reads as "serious product" to anyone who uses Linear, which includes most investors.
4. **Dense, Apollo/Clay-class data table.** Build it on TanStack via the shadcn data-table or COSS table: sticky header, sortable columns with `aria-sort`, a band column as a small colored dot plus text, an inline score bar, saved views as tabs, and a **floating bulk-action bar** on row selection. Bulk jobs show per-row status (queued, then scoring, then done) the way Clay does. Screens: Lists, Watchlist, Bulk, People.
5. **Real-product hero plus Tremor KPI row.** On the landing page, replace the mock and glow with a cropped, slightly tilted screenshot of the real account page (Linear/Attio treatment, fading into the page). Beneath it, add a live "logo wall" marquee of the signal sources (funding, jobs, news, tech stack, GitHub) rather than fake customer logos. In the dashboard, use Tremor KPI cards with sparklines ("Accounts scored", "HOT this week", "Avg. intent", "Credits left") plus a Tremor `Tracker` for scoring activity per day.

### Quick fixes spotted while skimming (not design research, but demo-visible)

- The hero badge still reads **"Spring '26"**, and today is 2026-09-29. It looks stale in front of an investor.
- In `app/globals.css`, the dark palette sets `--accent: #dfff00` with the comment **"Linear-style violet for primary"**. The value is right but the comment is wrong. It is harmless, but it hints that the look was copied from Linear.
- Both `--font-mono` definitions resolve to Instrument Sans, so numbers never get a true mono or tabular face unless `tnum` is applied. Make sure every score, credit and count uses `font-variant-numeric: tabular-nums`.
