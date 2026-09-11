# Brief: redesign the Score surface of VesperWise

> **How to use this file.** Paste it whole into Claude Design (or any design model) as the
> opening prompt. It is written to be self-contained: a designer with no access to this
> repository can act on it. Every code citation was verified against `main` on the date of
> writing — see *Provenance* at the foot of the file.

You are designing, not advising. Every section below must end in a decision you made and
will defend. Where you had a real choice, name the option you rejected and why in one line.

## Ground rules

Banned as load-bearing words: modern, clean, sleek, polished, intuitive, seamless, elevated,
pop, vibe, delightful. You may use them in passing; you may not use them as a reason.

Every claim about color carries an oklch value and a measured contrast ratio.
Every claim about size or rhythm carries a px value.
Every claim about hierarchy names what is first, second, third and what was demoted to
achieve that.

Do not return a menu of three directions for me to pick from. Pick, then justify.

## The product (so you do not design a generic AI wrapper)

VesperWise scores B2B companies 0-100 on purchase intent. A user pastes a domain; four
dated signal axes drive the score:

| axis | weight |
|---|---|
| funding | 25% |
| hiring | 20% |
| news | 20% |
| technology | 20% |
| web | 15% |

Score decays 15% per month from the latest signal date. Bands: **HOT** >=75, **WARM** >=50,
**COLD** <50. A fresh score costs 1 credit; a follow-up question costs 0.25; results cache
for 6h. Free plan is 20 credits/month.

Three consequences you must design for, not decorate around:

1. **Recency is the product.** A score without a visible date is worthless - decay means a
   90 from March is not a 90. Dates are primary data, not metadata.
2. **Credits make every action consequential.** The user is spending money per click. A UI
   that hides cost until after the charge is a trust failure.
3. **COLD is the common case and it must not read as an error.** Most scored accounts are
   cold. Design the COLD result as a legitimate, informative answer - "no signal" is a
   finding. If your COLD artboard looks like a failure state, you have designed it wrong.

## What exists now, and what is wrong with it

Stack: Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (new-york, base `neutral`),
Lucide, dark-only (`<html class="dark">`). Fonts today: Inter for UI, JetBrains Mono for all
numerics. Treat that second half as current state, not direction - see *Typography direction*
below.

Files: `app/(dashboard)/score/score-view.tsx` (~700 lines, hero + chat thread),
`components/score/score-result-card.tsx` (ring, `ResultHead`, `OverviewBlock`, `SignalGrid`),
`components/ai-elements/*` (`conversation`, `message`, `prompt-input`, `suggestion`, `tool`),
`components/ui/*` (22 shadcn primitives), `app/globals.css` (9,620 lines).

### Verified defects - these are facts from the codebase, not impressions

1. **`--accent` is defined three times at three different values.**

   ```
   app/globals.css:78    --accent: oklch(0.97 0 0);              /* shadcn "subtle hover grey" */
   app/globals.css:115   --accent: rgba(223,255,0, 0.18);
   app/globals.css:512   --accent:        #dfff00; /* Linear-style violet for primary */
   ```

   shadcn's `accent` semantic means *subtle hover background*. The brand's accent semantic
   means *saturated CTA*. They share one token name, so `bg-accent` on any shadcn component
   paints full lime. Note also that the line 512 comment still says "violet" above a lime
   value - the documentation drifted from the code and was never reconciled.
   **Fixing this naming collision is the first thing your token sheet must do.**

2. **The design fights itself.**

   ```css
   /* app/globals.css:3409 */
   .score-elements-submit {
     background: var(--accent) !important;
     color: #08090a !important;
     border-color: var(--accent) !important;
   }
   ```

   Three `!important`s to style one submit button. Treat every `!important` as evidence of a
   missing token, and say which token was missing.

3. **One color carries every meaning.** `#DFFF00` is simultaneously brand, primary CTA,
   focus ring, `chart-1`, sidebar-active and the "cyan" signal color - `--iq-cyan` has been
   overwritten to `#dfff00`, so cyan and lime are now literally the same value. At ~115 deg
   it also sits ~30 deg from HOT green `#4ADE80` (~145 deg), so brand and status read as one
   family. Nothing can be emphasised because everything already is.

4. **Two token systems, neither authoritative.** The `--iq-*` tokens (`--iq-accent`,
   `--iq-cyan`, `--iq-hot`, `--iq-warm`, `--iq-cold`) are declared and referenced **zero**
   times - a dead layer. Meanwhile **263** hardcoded lime literals sit in `.tsx` across
   **37** files (185 hex `#dfff00`/`#e8ff40`, plus 78 `rgba(223,255,0,...)`), including
   inline `style={{ background: "rgba(223,255,0,0.12)", color: "#dfff00" }}` on the hero
   feature icons. `globals.css` carries **64** exact-duplicate selectors (keyframes
   excluded); the `.sb-*` sidebar block is defined twice; `:root` is declared three times
   across two files that load in sequence (`globals.css` then `theme-overrides.css`).

5. **The meta row wraps mid-sentence.**

   ```css
   /* app/globals.css:3045 */
   .prompt-meta { display: flex; justify-content: space-between; ... }
   .prompt-meta .left  { display: inline-flex; gap: 12px; }
   .prompt-meta .right { display: inline-flex; gap: 14px; }
   ```

   No wrap control, so at real widths the four phrases orphan their second halves
   ("follow-ups" / "0.25 credits", "Cached for" / "6h"). Do not patch this with a media
   query - decide what that row is actually for and whether all four facts belong there
   at all.

6. **The entry screen is a landing page, not a tool.** A 56px centered headline
   ("What account do you want to score?"), a large radial glow, a marketing sub-line, a
   feature row ("4 trigger axes - Interactive chat - Signal breakdown - Recommended next
   action"), and `TRY A HOT PICK` chips. This is the *n*-th session of a paying user, not a
   first visit. The feature row is selling a product they have already bought; the RECENT
   row - the only genuinely useful block - sits below it, centered, and shows bare integers
   with no dates and no company names.

### The architectural question you must answer

After a score returns, the page becomes a chat thread: `.score-chat` wraps
`Conversation`/`ConversationContent`, and the result card is rendered **as a message** in
the transcript. So the score - a durable, cacheable, billable artifact that the user will
return to, export and share - is currently a chat turn that scrolls away.

Resolve this explicitly. Reasonable answers include a persistent result document with chat
docked beside or beneath it; a chat with the result pinned out of the scroll; or a genuine
transcript if you can argue the score really is ephemeral. **Whichever you choose, state
what happens to the result when the user asks four follow-up questions** - does it scroll
out of view, does it pin, does it collapse to a summary bar? That behaviour is the design.

## Palette direction (decided - implement it, do not relitigate)

Lime is demoted. It is not deleted.

- **Primary action:** near-white on near-black. `#F7F8F8` on `#08090A` measures ~18.7:1.
  This is the Linear/Vercel/shadcn convention and it costs no hue.
- **`#DFFF00` becomes a signature, not a workhorse.** Budget: **at most two lime elements
  per screen.** Candidates are the logo mark and the focus/active indicator. On each
  artboard, state your lime budget and where it was spent. If you exceed two, justify it
  per instance.
- **HOT `#4ADE80` / WARM `#F5B544` / COLD `#8A8F98` stay.** They are already hue-separated
  from each other. Once lime stops appearing as a status color the collision resolves.
- **Bands must not rely on hue alone.** Give each a second channel - shape, weight, position
  or label - so the system survives colorblindness and greyscale.

Your token sheet must also supply what is currently missing: a real **neutral ramp** (the
codebase improvises with `rgba(255,255,255,0.04/0.06/0.08/0.13)`), and an elevation model.
Prefer border-first over shadow-first on a near-black ground; if you disagree, show why.

`--primary-foreground` is currently `#ffffff` in one definition and `#000000` in another.
Say which is correct for your primary and why, with the ratio.

## Typography direction (decided - implement it, do not relitigate)

**Numerals do not get a monospace face.** Today JetBrains Mono sets every number in the
product, which puts one typeface in charge of two unrelated jobs: *this is code* and *this is
a number*. That is the same one-signal-two-meanings error as the `--accent` collision, wearing
different clothes. A score of 82, a 25% weight and a credit balance are quantities a person
reads, not source code.

Set quantities in the UI face with `tabular-nums` and let weight, size and tracking carry them.
Reserve monospace - if you keep it at all - for literal source: file paths, token names, hex
values, shell. Note that dropping the face is not sufficient on its own; the browser's UA
stylesheet sets `font-family: monospace` on `code`, `pre`, `kbd` and `samp`, so those need an
explicit override or they silently keep it.

When an identifier stops being monospaced it still has to read as an identifier rather than as
emphasised prose. Give it another channel - a tinted panel, uppercase with wider tracking, a
weight step - and say in the token sheet which channel carries which role. Numerals that align
in a column keep `tabular-nums` regardless of face.

## Deliverables

### 1. Annotated critique

Walk the current entry screen. For each finding: **what** (the concrete defect), **where**
(element and file), **why** (the principle violated), **fix** (the specific change).
Ten findings maximum, ordered by user impact - not by how easy they are to fix. If you
think one of my six defects above is wrong, say so and argue it; I would rather be
corrected than agreed with.

### 2. Artboards

One pan/zoom canvas. Minimum set:

| # | Artboard | Must resolve |
|---|---|---|
| 01 | Entry / empty state | What a returning paying user sees. Is there still a hero? |
| 02 | Scoring in progress | 4 parallel signal fetches. Honest progress vs. theatre - pick one and say which |
| 03 | Result - HOT | Score, band, 4 axes, dates, AI thesis, recommended action |
| 04 | Result - COLD | Same structure, must read as a finding and not a failure |
| 05 | Signal breakdown expanded | Weights and decay made legible without a chart that lies |
| 06 | Chat follow-up, 4 turns deep | Where the result card went. This is the architectural answer, drawn |
| 07 | Zero credits / error | Recoverable, not punitive |
| 08 | Entry + result at ~400px | Real constraint: `responsive.css` currently needs 49 `!important`s |

Annotate directly on the artboards: spacing values, type sizes, token names. An unlabelled
artboard is not a spec.

### 3. Token sheet

Pasteable, replacing the three-way `--accent` collision. Color in oklch with contrast ratios
per pair, type scale (size/weight/tracking/line-height), 4px-based spacing scale, radii,
elevation. **Name the tokens so shadcn's semantics and the brand's semantics cannot collide
again** - this is the deliverable's whole reason for existing, and how you solve it is the
first thing I will read.

Also specify focus-visible treatment. On a near-black ground with lime demoted, keyboard
focus needs a deliberate answer, not a browser default.

### 4. Component inventory and build order

- **Keep:** which of the 22 `components/ui/*` primitives stand as-is.
- **Adopt:** what to pull from shadcn/ui and from third-party shadcn-compatible registries.
  `libraries.dev` indexes these - browse it and name the specific registries and components
  you would take, with the reason. Prefer adopting a maintained primitive over hand-rolling.
  Anything you adopt must survive the token sheet without an `!important`.
- **Replace:** which ad-hoc CSS classes (`.sugg`, `.prompt-*`, `.score-elements-*`, the
  duplicated `.sb-*` block) collapse into primitives.
- **Order:** a sequence where each step ships independently. Tokens before primitives,
  primitives before screens. Flag anything that requires touching all 263 hardcoded literals
  at once - I want to know if there is an unavoidable big-bang step.

### 5. System rules (the part that outlives /score)

`/score` is the reference implementation for 12 other dashboard routes (dashboard, history,
people, watchlist, lists, billing, pipeline, inbox, bulk, analyze, settings, api-keys).
Extract the rules those routes must follow: density, type scale, band treatment, table rows,
empty states, loading, the lime budget.

Write them as **rules that can be checked**, not principles that can be nodded at.
"Every score in a table carries its signal date within 8px of it" is checkable.
"Maintain visual hierarchy" is not.

## How I will judge the response

- Could this brief have been written about any other product? If yes, you have failed.
- Does the COLD artboard read as an answer rather than an error?
- Is the token collision solved by naming, or merely by picking one of the three values?
- Does the 4-turns-deep artboard actually show where the result card went?
- Did you make decisions, or present options?

---

## Provenance

Every number in this brief was measured against the repository, not estimated. To
re-verify after the code moves:

```bash
# the three-way --accent collision
grep -n -- '--accent:' app/globals.css

# dead token layer (expect 0 for each)
for t in iq-accent iq-cyan iq-hot iq-warm iq-cold; do
  echo "$t: $(grep -ro "var(--$t)" app components --include=*.css --include=*.tsx | wc -l)"
done

# hardcoded lime literals in TSX (expect 263 across 37 files)
grep -rioE '#(dfff00|e8ff40)|rgba\(223, ?255, ?0' app components --include=*.tsx | wc -l
grep -rilE '#(dfff00|e8ff40)|rgba\(223, ?255, ?0' app components --include=*.tsx | wc -l

# exact-duplicate selectors, keyframe stops excluded (expect 64)
grep -oE '^[^{/@][^{]*\{' app/globals.css | sed 's/{$//; s/[[:space:]]*$//' \
  | grep -vE '^[[:space:]]*([0-9]+%|from|to)' | sort | uniq -d | wc -l

# !important as a design-debt metric - this should fall, never rise
grep -c '!important' app/globals.css app/responsive.css
```

**Note on `libraries.dev`:** it is referenced here as a source for the designer to browse.
It was unreachable from the environment in which this brief was written (blocked by an
egress proxy), so nothing in this document asserts what it contains.

**Related:** `design-reference/DESIGN-DIRECTION.md` is the existing design doc. Be aware it
has drifted - it specifies "violet primary, cyan accent", which the code has not matched for
some time. Where the two disagree, this brief and the code win.
