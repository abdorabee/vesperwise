# UI Color Consistency Update

## Summary

This change separates the VesperWise brand color from score-band status colors and makes primary actions behave consistently across the app.

- Keep brand lime `#DFFF00` for primary actions, the logo, and brand accents.
- Use distinct score-band colors across light and dark themes: coral HOT, amber WARM, and slate COLD.
- Keep primary action buttons on the exact brand lime during hover, with a subtle lime outline instead of shifting to the lighter hover color.
- Enlarge the dashboard sidebar and mobile-header wordmark to 36 px.
- Preserve green for positive score movement and success states; score bands no longer share that success color.

The shared score-band tokens are used by score badges and meters, the Home band-trend chart, History, People, Intent Hub/Pipeline, Watchlist, Lists, Bulk, Inbox, onboarding results, and the landing-page score examples. Primary button updates cover the shared button variants and the existing primary actions on Pricing, Billing, About, authentication, onboarding, and score-entry surfaces.

## Why

Previously, HOT reused green success styling in several places while using lime elsewhere. Primary buttons also switched to a noticeably different, lighter lime on hover. This made score status and brand actions compete visually and caused similar primary actions to look inconsistent between pages. The revised palette gives status and action separate visual roles while preserving the VesperWise lime brand.

## Scope and Access Limits

No authentication, database, scoring, billing, or production configuration was changed. This checkout has no local `.env.local`; opening authenticated dashboard routes requires Supabase environment settings, and the signed-out dashboard layout fails when `NEXT_PUBLIC_SUPABASE_URL` is missing. The public `/dev/preview` route uses fictional sample data, so it can verify the dashboard shell and Home colors, but not every authenticated Intent Hub, Watchlist, History, or Billing state in a signed-in browser.

For full visual QA, configure development Clerk and Supabase credentials from the project owner in the local environment, preferably pointing to a non-production database. No production credentials were added or used for this change.

## Verification

- `npx tsc --noEmit` passed.
- Targeted ESLint on changed TS/TSX files passed. CSS files are ignored by the repository ESLint configuration.
- Focused button and auth theme tests passed: 4 passed.
- Full Vitest run: 606 passed, 12 skipped, 1 failed. The remaining failure is `components/app-ui/public-theme.test.ts` line 34, which compares an exact LF-formatted CSS string; `app/globals.css` is CRLF in this Windows checkout. The assertion is unrelated to the score-band or CTA changes.
- `git diff --check` passed.

## Not Included

- No dashboard route was made public and no authentication checks were bypassed.
- No test or demo credentials were created.
- No static HTML mockups were updated; this change targets the actual Next.js application UI.
- No changes were pushed to the production branch by this document.
