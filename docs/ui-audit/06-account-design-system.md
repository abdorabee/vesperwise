# 06 — Account area + design system foundations

Auditor lens: better-ui, beautiful-shadows, frontend-design, accessibility (WCAG 2.2), ui-ux-pro-max. Static review plus grep counts. Authenticated pages return 307 to login, so there are **no rendered screenshots**. Anything marked *Not verified* needs a signed-in look before the demo.

## 1. Verdict: 4.5 / 10

**Settings (profile/account): 7/10.** Tidy, accessible, and honest.
**Billing: 5/10.** It looks like Stripe on a first glance. On a second glance it shows placeholder data and buttons that do nothing.
**API keys: 1/10.** The page says "Coming soon" even though the backend is done, and every paid plan sells API access.
**Design system: 3/10.** Four `:root` blocks disagree with each other. The effective lime is never actually `#DFFF00`. There are 47 font sizes, 31 radius values, 47 shadows and 1,320 inline style objects. A cascade-layer bug silently kills the "Apple redesign" tokens.

An investor who judges UI will not see the token mess directly. They *will* notice three things: the hardcoded "VISA" card, the buttons that do nothing, and an API product with no API keys.

## 2. What's good

- **Settings IA is solid.** `settings-rail.tsx` uses `aria-current`. `SettingsRow` has a label and help on the left, the control on the right, and an inline `role="alert"` error. Account save handles dirty, saving and saved states, and it validates length (`components/settings/account-form.tsx:36-70`). This is close to Linear or Vercel settings.
- **Custom controls are properly accessible.** They are `role="checkbox"`/`radiogroup` with `aria-checked`, and they were deliberately rebuilt on tokens for light mode (`components/settings/controls.tsx:6-10`).
- **The billing information architecture is ambitious and right.** It has plan, credit balance with burn-rate projection, next invoice, plans grid, top-ups, cost breakdown, stacked usage chart with CSV export, ledger, invoices, and a danger zone. The structure matches what a Series A SaaS ships.
- **The API key backend is production-grade.** Keys are SHA-256 hashed, the raw key is returned once, and revocation is scoped to the user (`app/api/user/api-keys/route.ts:22-40`).
- The shadcn `Button` has good baseline states: `focus-visible` ring, `motion-reduce:transition-none` and disabled opacity (`components/ui/button.tsx:8`).
- Tabular numerals are used widely (49 rules), and `prefers-reduced-motion` is honoured in 6 places.

## 3. Metrics (evidence: grep over `app/globals.css`, `theme-overrides.css`, `responsive.css`, `bulk-workspace.css` = 11,891 lines)

| Metric | Count | Notes |
|---|---|---|
| Distinct hex colors (CSS) | **78** (352 occurrences) | Plus 39 distinct hex in TSX (406 occurrences) |
| Distinct `rgb/rgba()` values | **164** (536 occurrences) | 238 are `rgba(255,255,255,x)`, which assume dark mode |
| Distinct oklch/hsl | 16 | Leftover shadcn default palette, including an indigo `--primary`, in `globals.css:65-100` |
| `:root` token blocks | **4 + 2 `.dark` blocks** | `globals.css:51,65,509,8650`, `theme-overrides.css:8,103`. Values conflict. |
| Lime literals | 77× `#dfff00` + 101× `223,255,0` | Mostly bypasses the tokens |
| Effective runtime `--brand` | light `#c9e92f`, dark **`#d4f238`** | Neither is `#DFFF00`. Dark sits next to the banned `#D4FF3D` (`theme-overrides.css:12,106`). |
| Banned `#D4FF3D` | 0 in code | Only mentioned in CLAUDE.md and HANDOFF.md |
| Brand hover | `#b9db24` / `#c6e62c` (darker) | Spec says `#E8FF40` (lighter) (`theme-overrides.css:13,107`) |
| Distinct `font-size` values | **47** (25 distinct px values) | Includes 12.5px, 11.5px, 9px and 8px, plus 15 one-off clamps |
| Font sizes < 12px | **285 declarations** | 181×11px, 70×10px, 29×9px, 3×8px, 2×11.5px |
| TSX arbitrary text sizes | 149 `text-[Npx]` | Includes 12.5px ×8 and 9px ×2 |
| `font-weight` values | 7 (400/500/600/650/680/700/800) | 650 and 680 are ad hoc |
| `letter-spacing` values | 27 | |
| `text-transform: uppercase` | 73 | All-caps mono eyebrows are everywhere |
| Distinct `border-radius` values | **31** | Four scales coexist: `--r-*` (defined twice with different values), `--radius-*`, raw px, raw rem |
| Distinct `box-shadow` values | **47** (89 declarations) | Plus 7 `--shadow-*` tokens that are mostly bypassed |
| Distinct `z-index` values | 13 (0,1,2,5,10,30,50,55,60,70,80,90,200) | No scale; 55 wedged between 50 and 60 |
| `!important` | **71** (globals 21, responsive **48**, bulk 2) | responsive.css fights globals |
| `transition: all` | 11 | better-ui violation |
| Duplicated top-level selectors | 27 | `.btn-primary` defined **8×** across 3 files; `:root` 4× |
| Likely-dead class selectors | ~190 / 1,163 (~16%) | e.g. `api-key-row`, `action-grid`, `ca-*`, `chat-*`. Heuristic; some are Clerk `cl-*` false positives. |
| Mojibake (double-encoded UTF-8) | **87 lines**, 2 rendered | `content: 'â–²'` / `'â–¼'` at `globals.css:4238,4244` shows garbage glyphs on the score result card |
| Inline `style={{}}` in TSX | **1,320** (41 in account area) | |
| Page primitives adoption | `page-primitives.tsx` imported by **2** files | The primitives exist but aren't used |
| Button systems | 3 | shadcn `Button` (16 files), `.btn-primary` (12), `.tb-btn` (23) |
| `focus-visible` rules in CSS | 7 | 9 `outline: none/0` |
| Lime contrast | `#DFFF00` on white **1.14:1**; `#c9e92f` on white 1.38:1; `#b9db24` (light `--accent-2`) 1.59:1; focus ring `#a8ca19` on white **1.89:1** | Black on `#DFFF00` is 18.4:1 (good). Lime on `#08090a` is 17.5:1 (good). |
| Text tokens | light `--text-quaternary #8b94a3` on white 3.06:1 (fails AA body); dark `#62666d` on `#08090a` 3.45:1 (fails) | |

## 4. Findings

| ID | Sev | What the user/investor sees | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| DS1 | **P0** | The "API Keys" page is a "Coming soon" placeholder. Every paid plan card advertises "API · N rpm". An API-first B2B product that can't issue a key reads as vapor. | `app/(dashboard)/api-keys/page.tsx:7-32`; `components/dashboard/nav-config.ts:70` (`comingSoon: true`); backend works in `app/api/user/api-keys/route.ts` | Build a Resend/Stripe-grade page on the existing GET/POST/DELETE. Include: a keys table (label, `vw_…abcd` prefix, created, last used, status), a "Create key" dialog that shows the secret once with a copy button and "I've saved it", revoke with a confirm dialog, a curl quick-start with the key pre-filled, and a rate-limit/plan note. Remove `comingSoon`. | M |
| DS2 | **P0** | The billing page shows a hardcoded **"VISA"** card for any Polar customer, whatever card they actually use. It also shows "PCI-COMPLIANT", "Tax · estimated: included" and "Drafted · charges". These are fabricated facts on a money page. | `components/billing/billing-hero.tsx:212`; `billing-payment-details.tsx:22-40,45`; `billing-hero.tsx:203-206` | Show a generic card icon with "Managed in Polar", or fetch the real brand/last4 from Polar. Remove the PCI badge and the tax line unless they're true. | S |
| DS3 | **P0** | Dead controls. "Download statement" has no handler. The "Year: 2026 ▾" chip looks like a dropdown but links to the portal. The "Last cycle" tab says "coming soon". The **90D range silently shows 30D data**. "▲ —" is a placeholder delta. "Pause workspace" goes to the Polar portal, which has no pause feature. | `billing-page-head.tsx:40-45`; `billing-invoices.tsx:19-27`; `billing-cost-breakdown.tsx:52-55,90`; `billing-usage-chart.tsx:29`; `billing-danger-zone.tsx:37-45` | Delete any control that isn't wired. Remove 90D and YTD until the data exists. Hide the delta when it's null. Remove the Pause row. A missing control beats one that does nothing. | S |
| DS4 | **P0** | Garbage glyphs "â–²"/"â–¼" render before the win/gap bullets on the score result card. That is the core demo screen. | `app/globals.css:4238,4244` (bytes `303 242 342 200 223`, double-encoded UTF-8) | Replace with `'\25B2'`/`'\25BC'`, or better a Lucide icon. Re-encode the file and clean the 85 mojibake comment lines. | S |
| DS5 | P1 | Brand drift. Runtime lime is `#c9e92f` in light and `#d4f238` in dark, not `#DFFF00`. Hover goes *darker* instead of to `#E8FF40`. Meanwhile 178 literal `#dfff00` values render the true lime next to them, so two limes appear on one screen. | `theme-overrides.css:11-13,105-107` vs `globals.css:66,532` | Set `--brand: #DFFF00; --brand-hover: #E8FF40` in both themes. Replace the literals with `var(--brand)`. For lime *text* on light surfaces, add `--brand-ink: #4d5a00` (7.6:1). | S |
| DS6 | P1 | `--accent` means three different things. In `globals.css:532` it is lime. `theme-overrides.css` redefines it as grey `#eef1f6` or `rgba(255,255,255,.06)` (shadcn semantics). All 50 CSS `var(--accent)` uses that expect lime now render grey. Examples: the watch sparkline, picker ticks, and the **Pro plan swatch, which is near-invisible**. | `globals.css:1955,4047,4073`; `lib/billing-plans.ts:104`; `theme-overrides.css:34,118` | Keep the shadcn `--accent` as neutral and move every lime intent to `--brand`. Codemod `var(--accent)` to `var(--brand)` in the non-shadcn CSS. CLAUDE.md needs updating to match. | M |
| DS7 | P1 | Lime text on white is unreadable in light mode. "Top up 500" is `#dfff00` at 1.14:1. "Compare plans →" and the API-keys icon use `--accent-2` (#b9db24) at 1.59:1. Focus ring `--ring` is #a8ca19 at 1.89:1, which fails WCAG 1.4.11 (3:1). | `billing-help-row.tsx:66,74`; `api-keys/page.tsx:11`; `theme-overrides.css:38,425` | Keep lime as a fill with black text. For text and rings in light mode use `--brand-ink #4d5a00`, or ring `#15171a`. | S |
| DS8 | P1 | Light-mode hover states on billing are invisible: 59 `rgba(255,255,255,…)`/near-black literals inside `.billing-page` rules, with white-on-white hover. *Not verified in browser.* | `globals.css` `.billing-page .inv-row:hover`, `.pm-edit:hover`, `.pc-cta.outline:hover`, etc. (6545-9376) | Replace with `var(--surface-hover)` / `var(--surface-wash)`. | S |
| DS9 | P1 | Cascade-layer bug. The "Apple-led redesign" `:root` (radius 8/12/16/22/28, body 14px, gradient body) sits inside `@layer base`, so the **unlayered** `:root` at `globals.css:509` (radius 4/6/8/12/16, body 16px) beats it. The redesign tokens are dead and radius is inconsistent with what the designer intended. | `globals.css:8649-8700` vs `509-563` | Pick one scale and delete the other. If the redesign is intended, remove it from `@layer base` or delete the older block. | S |
| DS10 | P1 | Typography has no scale: 47 sizes, 285 declarations below 12px (9px and 8px exist), 27 letter-spacings, weights 650 and 680. Dense grey 10–11px mono caps give an "admin template" feel and fail readability. | Metrics above; `billing-hero.tsx:79,194` ("CURRENT PLAN · ACTIVE", "NEXT INVOICE") | Adopt a 6-step scale (§5). Floor is 12px, with 11px only for tabular captions. Collapse the all-caps eyebrows to sentence-case 12px/500 in `--text-tertiary`. | M |
| DS11 | P1 | `--font-mono` is **Instrument Sans**, not a monospace. The 256 "mono" usages (invoice numbers, key IDs, rates) don't align, and API keys will look amateur. | `globals.css:547` | Load `Geist Mono` or `JetBrains Mono` via `next/font` and point `--font-mono` at it. Reserve it for code, keys and IDs only. | S |
| DS12 | P1 | Three button systems with eight `.btn-primary` definitions. The press is `translateY(1px)` rather than `scale(.96)`. Padding and height vary by page. | `globals.css:759,2419,8985,9019`; `theme-overrides.css:385,412,510`; `responsive.css:328` | Make shadcn `Button` canonical: add a `brand` variant (lime fill, black text), map `.btn-primary`/`.tb-btn` to it, and delete the duplicates. | M |
| DS13 | P1 | Billing's "Upgrade — save 4 days/mo" CTA is meaningless. "$0.10 / credit" is shown on the free plan. `pc-strike` is an `&nbsp;` spacer. | `billing-plans-grid.tsx:52,86`; `billing-hero.tsx:40-43` | "Upgrade to Growth". Show "—" for free. Delete the spacer. | S |
| DS14 | P1 | Settings navigation inconsistency. "Billing" in the settings rail leaves Settings for a page without the rail, so the user loses context. | `settings-rail.tsx:33-38`; `billing-view.tsx:36` | Render `/billing` inside the settings layout, or add the rail to the billing shell. | S |
| DS15 | P2 | Icon-only invoice actions (View/Download) and the edit-billing link have only `title`, no accessible name. Their 22px targets are below the 24px minimum. | `billing-invoices.tsx:59-68`; `billing-hero.tsx:214-222` | Add `aria-label`, give the SVGs `aria-hidden`, and set min 28×28. | S |
| DS16 | P2 | 1,320 inline `style={{}}` (41 in the account area) with raw fontSize/colour/letterSpacing. Theming and consistency leak. | e.g. `billing-payment-details.tsx:22-30`, `billing-topups-panel.tsx:21` | Extract to classes or tokens. Start with the account area. | M |
| DS17 | P2 | 47 shadow values, 13 unscaled z-indexes, 71 `!important`, 11 `transition: all`. | Metrics | Adopt the 3-step shadow set and 6-step z-scale in §5, name transitioned properties, and pay down the `!important` in `responsive.css`. | M |
| DS18 | P2 | ~190 unreferenced selectors (~16%) in a 9,800-line globals file. Dead code includes an `api-key-row` style for a page that doesn't exist. | Heuristic scan | Run PurgeCSS in report mode, split globals by feature, and delete dead blocks. | M |
| DS19 | P2 | Text token contrast: light `--text-quaternary #8b94a3` is 3.06:1 and dark `--text-quaternary #62666d` is 3.45:1. Both are used for real copy. | `theme-overrides.css:67`; `globals.css:521` | Raise to `#6b7280` (light, 4.8:1) and `#7c818a` (dark). Keep quaternary for disabled or decorative use only. | S |
| DS20 | P2 | The usage chart hardcodes hex segment colours (`#dfff00`, `#a0a0a0`…), so it won't theme. | `billing-usage-chart.tsx:6-12` | Use `var(--chart-1..5)`. | S |

## 5. Proposed minimal token set

```css
:root {                         /* light */
  --brand: #DFFF00; --brand-hover: #E8FF40; --brand-ink: #4D5A00; --on-brand: #0A0B0C;
  --bg: #F6F7F8; --surface: #FFFFFF; --surface-hover: #F1F3F6; --border: rgb(10 14 26 / .10);
  --text-1: #15171A; --text-2: #41464F; --text-3: #5F6570; /* ≥4.5:1 */
  --success: #15803D; --warning: #B45309; --danger: #DC2626;
  --ring: #15171A;
}
.dark {
  --brand: #DFFF00; --brand-hover: #E8FF40; --brand-ink: #DFFF00; --on-brand: #0A0B0C;
  --bg: #08090A; --surface: #111316; --surface-hover: #1A1D20; --border: rgb(255 255 255 / .08);
  --text-1: #F7F8F8; --text-2: #B4BBC8; --text-3: #8A8F98;
  --success: #4ADE80; --warning: #F5B544; --danger: #F87171;
  --ring: #DFFF00;
}
/* type (Instrument Sans + Geist Mono for code/keys/IDs only) */
--fs-xs: 12px/16px; --fs-sm: 13px/20px; --fs-base: 14px/22px; --fs-lg: 16px/24px;
--fs-xl: 20px/28px; --fs-2xl: 28px/34px; --fs-display: clamp(32px, 4vw, 44px);
weights: 400 / 500 / 600 only. tracking: 0 body, -0.01em ≥20px.
/* radius (concentric: outer = inner + padding) */
--r-sm: 6px (chips, inputs); --r-md: 10px (buttons, rows); --r-lg: 14px (cards/panels); --r-full: 999px.
/* shadow (beautiful-shadows) */
--shadow-sm: 0 2px 3px -1px rgb(0 0 0/.1), 0 1px 0 rgb(25 28 33/.02), 0 0 0 1px rgb(25 28 33/.08);
--shadow-md: 0 0 0 1px rgb(0 0 0/.06), 0 1px 1px -.5px rgb(0 0 0/.06), 0 3px 3px -1.5px rgb(0 0 0/.06), 0 6px 6px -3px rgb(0 0 0/.06), 0 12px 12px -6px rgb(0 0 0/.06), 0 24px 24px -12px rgb(0 0 0/.06);
--shadow-lg: (Beautiful lg, for dialogs and popovers only). Dark mode uses a 1px rgb(255 255 255/.08) ring plus a black drop.
/* spacing: 4-pt: 4 8 12 16 24 32 48 64 */
/* z: base 0 · raised 10 · sticky 20 · dropdown 30 · overlay 40 · modal 50 · toast 60 */
/* motion: 150ms cubic-bezier(0.2,0,0,1) for colour/opacity; press scale(.96) */
```

## 6. Top 3 highest-leverage changes

1. **Ship the real API Keys page (DS1).** The backend already exists, so this is mostly UI: a table, a show-once create dialog, revoke, and a curl snippet in a real monospace font (DS11). It turns the biggest credibility hole into a demo highlight, because devs judge an API product by its key page.
2. **Make billing honest (DS2 + DS3 + DS13), about a 1-hour sweep.** Remove the fake VISA, PCI and tax items, the dead Download/Year/Pause/Last-cycle controls, the 90D range that lies, and the "save 4 days" copy. A slightly smaller page that is all real reads as far more credible than a busy one with placeholders.
3. **Collapse the tokens to one source of truth (DS5 + DS6 + DS9 + DS4).** Set `--brand #DFFF00` / `#E8FF40` in both themes and codemod lime-intent `var(--accent)` and the literal lime values to `--brand`. Delete the duplicate `:root` blocks and the dead `@layer base` redesign block, and fix the mojibake glyphs. This fixes the two limes on one screen, the invisible Pro swatch and the unreadable lime text in light mode. After that, the type scale (DS10) is the next pass.

*Not verified (needs signed-in browser):* light-mode billing hovers (DS8), actual rendered radius after the layer conflict, and the mobile layout of the 3-column billing hero.
