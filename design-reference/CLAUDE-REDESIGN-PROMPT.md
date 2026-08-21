# VesperWise → "Claude" Redesign Prompt

This document is a **copy-paste-ready prompt** for redesigning VesperWise's UI toward the
**Claude / Anthropic design *principles*** — warm, editorial, calm, humane — while letting you
**choose how much of your brand color to keep.**

The prompt is deliberately split into two independent layers:

- **Principles (always apply)** — typography, spacing, calm depth, restraint, interaction. This
  is ~80% of the "Claude feel" and is *palette-independent*.
- **Palette track (pick one)** — how much of today's acid-lime brand you retain:
  - **Track A — Keep lime, warm-dark:** dark theme, but warm (not pure black), lime dosed down. Max brand retention.
  - **Track B — Keep lime, paper:** Claude's ivory canvas + lime as the single accent. Most "Claude-like" while still clearly VesperWise.
  - **Track C — Full clay:** adopt Anthropic's terracotta accent. Strongest editorial calm; changes the brand color.

- **How to use:** decide your track, then paste everything inside the `PROMPT` block into Claude
  Code (or your AI design tool) at the repo root. It is self-contained.
- **Companion doc:** pair with [`YC-UX-TEARDOWN.md`](./YC-UX-TEARDOWN.md); apply the UX fixes
  (activation, IA, honesty, monetization) *alongside* this visual re-skin.
- **Scope note:** visual/interaction re-skin + token unification only. Do not alter scoring,
  billing, or API logic.

---

## Which track should you pick?

Today's live palette (confirmed on `vesperwise.com`): acid-lime `#dfff00` / `#e8ff40` on
`#000000`, bands **HOT `#4ade80` · WARM `#f5b544` · COLD `#8a8f98`**.

| | **Track A — lime, warm-dark** | **Track B — lime, paper** | **Track C — full clay** |
|---|---|---|---|
| Canvas | warm charcoal `#1E1C1A` | ivory `#FAF9F5` + white cards | ivory `#FAF9F5` + white cards |
| Accent | lime `#dfff00` (dosed down) | lime fills + `#5F6B00` lime-ink | clay `#C15F3C` |
| Feel | calm, premium (Linear-but-humane) | editorial + unmistakably VesperWise | strongest Claude calm |
| Brand retention | **Highest** | High (brand lives in accent) | Lowest (new accent) |
| Best when | dark neon identity is core | biggest polish jump for a YC deck | open to rebranding color |

**Rule of thumb:** adopt *all* the principles regardless of track. If your dark identity matters →
**A**. If you want the largest perceived design-maturity jump → **B**. Only choose **C** if you're
open to changing the brand color.

Whichever you pick, two accessibility facts about lime are non-negotiable:

- `#dfff00` as a **fill with black text** ≈ 18:1 (excellent) — good for primary buttons/chips.
- `#dfff00` as **text / thin strokes on white** ≈ 1.1:1 (invisible) — on a light canvas you MUST
  use a darker **lime-ink** (`#5F6B00`) for links/labels/icons. On dark, lime text is fine.
- Never place neon lime immediately next to **HOT green** — they collide for color-blind users.
  Keep HOT/WARM/COLD in their own semantic ramp + always add a dot/label.

---

## PROMPT (copy everything below this line)

```text
You are redesigning the UI of an existing Next.js 16 (App Router, React 19) B2B SaaS called
VesperWise. It scores companies 0–100 on purchase intent from cited evidence (funding, hiring,
news, tech change) and shows AI reasoning + a next action. Stack: Tailwind CSS v4, shadcn/ui,
Recharts, Lucide. Design tokens live in `app/globals.css` (a `:root` block, a `.dark` block, plus
`theme-overrides.css`); dashboard pages use semantic CSS classes in `@layer components` mirroring
static HTML prototypes.

GOAL
Redesign the product to feel calm, warm, editorial, and humane (the "Claude / Anthropic" feel),
WITHOUT changing any backend, scoring, billing, or API behavior, and WITHOUT reducing data density
or the meaning of the HOT/WARM/COLD intent bands. The visual change has two layers: (1) PRINCIPLES,
which always apply; and (2) a PALETTE TRACK, which you pick below. Most of the "Claude feel" comes
from the principles, not the accent color.

>>> STEP 0 — CHOOSE PALETTE TRACK (pick exactly one; default = TRACK B) <<<
  TRACK A = keep the lime brand, warm-dark canvas (max brand retention)
  TRACK B = keep the lime brand as accent, on a light "paper" canvas (recommended)
  TRACK C = full Anthropic clay accent on paper (changes brand color)
Set: SELECTED_TRACK = B   ← edit this line to A, B, or C.
Use ONLY the token block for the selected track. Ignore the other two.

────────────────────────────────────────────────────────────────────────
PRINCIPLES (ALWAYS APPLY — palette-independent)
────────────────────────────────────────────────────────────────────────
1. Warm neutrals, never cold extremes. No pure #000 or pure #FFF as page/surface backgrounds.
   Backgrounds are warm (ivory on light tracks, warm charcoal on the dark track); cards feel like
   high-quality paper.
2. One confident accent, used sparingly. The brand accent appears on ~5% of the surface — primary
   actions, active states, key highlights. No large accent washes, neon glows, scanlines, or
   backdrop-blur "glass". The accent should feel intentional, not loud.
3. Editorial typography. Serif for display/headings (calm, book-like authority); a clean humanist
   sans for UI/body; monospace ONLY for numerics/data (scores, deltas, domains, counts) with
   tabular-nums. Generous line-height and measure; let headings breathe.
4. Calm, generous space. More whitespace and vertical rhythm than today's tight Linear chrome —
   but keep tables and stat rows information-dense. Motto: "roomy shell, dense data."
5. Soft, quiet depth. Hairline warm borders and very soft shadows instead of glass/blur.
   Rounded-but-restrained radii (6–14px).
6. Humane, plain language. Buttons and empty states read like a helpful person, not a dashboard.
7. Accessibility first. All text ≥ WCAG AA. Never rely on color alone for band meaning — always pair
   with a label + dot/icon. Visible focus ring on every interactive control.

────────────────────────────────────────────────────────────────────────
PALETTE TOKENS — use ONLY the block for SELECTED_TRACK
Define these once as the single source of truth in app/globals.css. Delete competing/duplicate
definitions. Reference tokens everywhere via var(--…); never hardcode brand hex in components.
────────────────────────────────────────────────────────────────────────

/* ===== TRACK A — keep lime, warm-dark ===== */
:root, .theme-a {
  --bg:#1E1C1A; --surface:#26241F; --surface-2:#302D27;
  --text-primary:#F5F3EC; --text-secondary:#C4C0B4; --text-tertiary:#928E82; --text-quaternary:#6E6A5F;
  --border:rgba(255,255,255,0.09); --border-strong:rgba(255,255,255,0.15); --border-subtle:rgba(255,255,255,0.05);
  --brand:#dfff00;            /* lime — fills, active states, key accents (dose to ~5% of surface) */
  --brand-hover:#e8ff40;
  --brand-contrast:#141310;   /* black text on lime fills */
  --brand-ink:#dfff00;        /* lime as text/links is OK on this dark canvas */
  --brand-tint:rgba(223,255,0,0.14);
  --ring:rgba(223,255,0,0.50);
  --hot:#5FD89A; --hot-bg:rgba(95,216,154,0.14); --hot-border:rgba(95,216,154,0.34);   /* shifted teal-green to avoid lime collision */
  --warm:#E4B15A; --warm-bg:rgba(228,177,90,0.14); --warm-border:rgba(228,177,90,0.34);
  --cold:#A3A093; --cold-bg:rgba(163,160,147,0.12); --cold-border:rgba(163,160,147,0.30);
}

/* ===== TRACK B — keep lime, paper (RECOMMENDED / default) ===== */
:root, .theme-b {
  --bg:#FAF9F5; --surface:#FFFFFF; --surface-2:#F0EEE6;
  --text-primary:#1F1E1D; --text-secondary:#54524D; --text-tertiary:#78756E; --text-quaternary:#97938A;
  --border:#E5E2D9; --border-strong:#D6D2C6; --border-subtle:#EFEDE4;
  --brand:#dfff00;            /* lime — FILLS ONLY, always with black text */
  --brand-hover:#C8E600;
  --brand-contrast:#141310;
  --brand-ink:#5F6B00;        /* darker lime "ink" — REQUIRED for links/labels/icons on light */
  --brand-tint:#F2F5CC;
  --ring:rgba(95,107,0,0.45);
  --hot:#3E7A55; --hot-bg:#E7F0E9; --hot-border:#BFD6C6;
  --warm:#C98A2B; --warm-bg:#F6EAD3; --warm-border:#E4CE9C;
  --cold:#8A8478; --cold-bg:#EFEDE6; --cold-border:#D8D3C7;
}

/* ===== TRACK C — full clay, paper ===== */
:root, .theme-c {
  --bg:#FAF9F5; --surface:#FFFFFF; --surface-2:#F0EEE6;
  --text-primary:#1F1E1D; --text-secondary:#54524D; --text-tertiary:#78756E; --text-quaternary:#97938A;
  --border:#E5E2D9; --border-strong:#D6D2C6; --border-subtle:#EFEDE4;
  --brand:#C15F3C;            /* clay */
  --brand-hover:#A84E30;
  --brand-contrast:#FFFFFF;
  --brand-ink:#A84E30;        /* darker clay for small text/links */
  --brand-tint:#F5E6DE;
  --ring:rgba(193,95,60,0.45);
  --hot:#3E7A55; --hot-bg:#E7F0E9; --hot-border:#BFD6C6;
  --warm:#C98A2B; --warm-bg:#F6EAD3; --warm-border:#E4CE9C;
  --cold:#8A8478; --cold-bg:#EFEDE6; --cold-border:#D8D3C7;
}

/* Fonts + shape + depth (ALL tracks) */
--font-serif:"Tiempos Text","Fraunces",Georgia,"Times New Roman",serif;   /* display/headings */
--font-sans:Inter,"Styrene B",ui-sans-serif,system-ui,sans-serif;          /* UI/body */
--font-mono:"JetBrains Mono",ui-monospace,monospace;                       /* data only */
--r-sm:6px; --r-md:8px; --r-lg:12px; --r-xl:14px;
--shadow-sm:0 1px 2px rgba(20,19,16,0.06);
--shadow-md:0 4px 16px rgba(20,19,16,0.08);

ACCENT USAGE RULES (per track)
- Links, labels, icons, and any accent TEXT: use var(--brand-ink). (On Track A this equals lime;
  on Tracks B/C it is the darker ink so it stays legible on light surfaces.)
- Solid buttons / active fills / chips: background var(--brand) with color var(--brand-contrast).
- Subtle accent backgrounds: var(--brand-tint).
- Never use --brand for a HOT/WARM/COLD band (bands have their own ramp).
- Track B specifically: NEVER render lime as text or thin strokes on white — fills-with-black-text only.

TYPOGRAPHY RULES (all tracks)
- Page titles / marketing headlines: serif (--font-serif), large, tight leading, primary ink.
- Section labels / eyebrows: sans, 11–12px, uppercase, letter-spacing 0.04em, --text-tertiary.
- Body / UI: sans, 14–16px marketing, 13–14px dashboard, line-height ~1.5.
- Numerics in tables/stats/scores: --font-mono, font-variant-numeric: tabular-nums (KEEP this).
- Do NOT set serif on data tables or buttons — serif is for display/prose only.

COMPONENT DIRECTION (apply across the app; reference tokens, not literal colors)
- App shell (components/dashboard/dashboard-shell.tsx, nav.tsx, dashboard-topbar.tsx): warm canvas,
  surface sidebar with hairline --border; active nav item = --brand-tint bg + --brand-ink label +
  --brand left-accent. Replace neon/glass with flat warm surfaces; slightly increase sidebar/topbar
  padding; keep 232px sidebar width.
- Buttons (components/ui/button.tsx + .btn-primary): primary = solid var(--brand) fill,
  var(--brand-contrast) text, radius --r-md, subtle --shadow-sm, hover var(--brand-hover) (no
  translate/scale gimmicks). Secondary = surface + --border-strong + ink text. Drop the pill/full-round
  default; use --r-md. Fix the existing bug where .btn-primary consumes a translucent --accent tint.
- Score result (app/(dashboard)/score/score-view.tsx AND components/score/score-result.tsx — wire the
  latter in; it is currently dead code): the hero moment. Score ring uses band-color stroke on a
  surface card; the big score number is mono. Show band chip, four trigger axes, per-signal status
  (ok/stale/unavailable), evidence links, freshness ("scored 2h ago"), and the AI verdict + next
  action as a calm readable prose block (sans, generous leading). Dense but airy.
- Bands: keep HOT/WARM/COLD semantics + copy. Render .band chips = band-bg fill + band-border +
  band-colored dot + band-colored label. Never use --brand for a band. Meaning must survive grayscale.
- Tables/lists (watchlist, history, pipeline, bulk, lists): surface bg, hairline --border-subtle row
  separators, 11px uppercase --text-tertiary headers, 13–14px rows, mono for score/delta/domain
  columns, hover = --surface-2. Keep density; only warm the palette and soften separators.
- Charts (Recharts / signal-mix donut / distribution): warm categorical palette from band + brand +
  muted ochres/olives; low-opacity area fills; grid lines --border-subtle. Avoid neon.
- Empty & loading states: warm, friendly. Add skeletons using --surface-2 shimmer with role="status"
  / aria-live="polite". Empty states = small --brand-tint icon tile, serif title, one-line plain-language
  hint, clear primary action (e.g. "Score your first account").
- Inputs/dialogs/badges (components/ui/*): surface bg, --border, --r-md/--r-lg, --ring focus, no heavy
  blur/glass. Keep 16px input font on mobile to prevent iOS zoom.
- Landing (components/landing/LandingPage.tsx): warm hero, serif headline with a single accent phrase
  in var(--brand-ink) (replace the lime gradient), calm product screenshot on a soft card, generous
  whitespace, primary CTA in var(--brand). Editorial and confident, not neon.

GUARDRAILS
- Do not change scoring math, credit/billing logic, API routes, auth, or data fetching.
- Put page CSS in @layer components in app/globals.css; for layout-critical grid/flex use inline
  styles as the existing code does. Keep semantic class names from the HTML prototypes.
- Eliminate the current token chaos: exactly ONE definition each of --brand, --accent, .band, and
  .btn-primary. Remove/rename the conflicting --iq-*, cyan-as-lime, and Apple-layer radii overrides
  so components stop drifting from the tokens.
- Replace hardcoded hex in .tsx/.css with tokens. Grep for "#dfff00","#e8ff40","#08090a","#000",
  "#fff","rgba(223,255,0" and convert them.
- Provide a theme toggle via next-themes if the chosen track ships both a light and a dark variant;
  otherwise ship the single selected track. Ensure the selected track passes the acceptance criteria.

DELIVERABLES
1. Updated app/globals.css (+ theme-overrides.css) with the unified token system for SELECTED_TRACK.
2. Updated shared components (button, badge, card, input, dialog, table primitives, dashboard shell,
   nav, topbar) to consume tokens.
3. Re-skinned key surfaces: /score (result), dashboard home, one data table page (watchlist), billing,
   and the landing hero — as the pattern for the rest.
4. A short design-reference/CLAUDE-THEME.md documenting the final tokens, the chosen track, and usage rules.
5. `npm run lint` and `npm run build` pass; no hardcoded brand hex remains in changed files.

ACCEPTANCE CRITERIA (per surface)
- Global: page backgrounds are warm (never #000/#FFF); one accent used sparingly (~5% of surface);
  serif for display, sans for UI, mono for all numerics. On Tracks B/C no acid-lime remains; on Track
  A lime remains but is dosed down and never washed/glowing.
- Contrast: primary text ≥ 7:1, secondary ≥ 4.5:1, tertiary ≥ 4.5:1 (large ≥ 3:1), band colors ≥ 3:1
  on their backgrounds, accent buttons ≥ 4.5:1 with their contrast text at used sizes. Track B: verify
  --brand-ink (not raw lime) is used for all accent text on light.
- Bands: HOT/WARM/COLD instantly distinguishable AND legible in grayscale (dot + label present); no
  lime↔HOT-green confusion.
- Score result: score, band, four triggers, per-signal status, evidence, freshness, and next action
  visible on one calm card; feels trustworthy and editorial.
- Focus: every interactive element shows a visible --ring focus; keyboard nav works.
- Mobile (≤640px): band chips remain visible somewhere on screen; tap targets ≥44px; inputs 16px.
- Density preserved: tables/stat rows no less information-dense than today, just warmer and softer.

Work surface-by-surface. After each surface, show a brief before/after description and confirm the
acceptance criteria for that surface before moving on. State which SELECTED_TRACK you used.
```

---

## Optional add-ons you can append to the prompt

- **"Also produce a one-screen style tile"**: a `/style` demo page rendering the token swatches,
  buttons, band chips, a score ring, and a sample table so you can screenshot the new system for a
  YC application.
- **"Ship all three as switchable themes"**: define `.theme-a` / `.theme-b` / `.theme-c` and gate via
  `NEXT_PUBLIC_THEME` so you can A/B lime-dark vs lime-paper vs clay with investors before committing.
- **Reference imagery**: point the tool at Anthropic's own surfaces (claude.ai) for the paper + serif +
  restraint feel, and at this repo's `IntentIQ Linear.html` (the earlier violet direction) as proof the
  codebase already supports non-lime palettes.

---

## Rationale

Design *principles* and *palette* are independent. Anthropic's "Claude" look is mostly warm neutrals,
editorial serif-forward type, generous space, and restraint — only a small part is the specific clay
accent. That means you can adopt the full feel while keeping lime as your brand:

- **Track A** keeps your dark neon identity but makes it calm and premium by warming the black and
  dosing the lime down.
- **Track B** (recommended) gives the biggest perceived design-maturity jump — Claude's paper canvas
  with lime as a sparing accent — while staying unmistakably VesperWise. It requires the darker
  `--brand-ink` for accent text because neon lime is illegible on white.
- **Track C** is the purest Anthropic execution if you're willing to change the accent to clay.

In every track the HOT/WARM/COLD band semantics and mono numerics are preserved, so the product's
core language and data density survive the re-skin.
