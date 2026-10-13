# VesperWise colour changes and screenshots

This report documents the recent colour pass and embeds screenshots for every modified standalone page design, plus the relevant running app pages that were accessible in the local preview.

## Palette

| Use | Colour | Hex |
|---|---|---|
| Brand | Classic VesperWise lime | `#dfff00` |
| HOT | Coral | `#fb7185` |
| WARM | Amber | `#fbbf24` |
| COLD | Blue | `#60a5fa` |

The brand lime stays the brand colour. HOT, WARM, and COLD remain separate semantic status colours. The brighter `#e8ff40` remains available as a hover state.

## What changed

- Shared theme colours in [app/globals.css](../../app/globals.css) now define HOT as coral, WARM as amber, and COLD as blue. Chart colours follow those tokens. Decorative places that used the near-lime `#e8ff40` now use classic lime `#dfff00`.
- The dashboard trend chart in [components/dashboard/home/band-trend.tsx](../../components/dashboard/home/band-trend.tsx) previously used the generic foreground colour for HOT. In dark mode that is near-white, which caused the white bars. HOT now uses `var(--hot)`.
- People and History score rings use the matching semantic colour for their band. Their signal accents and decorative avatar colours were aligned with the palette in [app/(dashboard)/people/people-view.tsx](../../app/(dashboard)/people/people-view.tsx), [app/(dashboard)/history/history-view.tsx](../../app/(dashboard)/history/history-view.tsx), and [components/history/history-run-tab.tsx](../../components/history/history-run-tab.tsx).
- [design-reference/score-chat-prototype/index.html](../../design-reference/score-chat-prototype/index.html) uses the same HOT/WARM palette and classic lime for the technology signal.
- Shared theme and shell styles also affect other routes, so the running public pages below are included as visual checks.

## Modified standalone page designs

These are the eight modified `IntentIQ *.html` page designs in the project. Each screenshot is a full-page capture of that design.

### Dashboard design

![IntentIQ Dashboard page design](./screenshots/dashboard.png)

### History design

![IntentIQ History page design](./screenshots/history.png)

### People design

![IntentIQ People page design](./screenshots/people.png)

### Score design

![IntentIQ Score page design](./screenshots/score.png)

### Lists design

![IntentIQ Lists page design](./screenshots/lists.png)

### Watchlist design

![IntentIQ Watchlist page design](./screenshots/watchlist.png)

### Billing design

![IntentIQ Billing page design](./screenshots/billing.png)

### Autopilot design

![IntentIQ Autopilot page design](./screenshots/autopilot.png)

### Linear / landing design

![IntentIQ Linear page design](./screenshots/linear.png)

### Score chat prototype

![Score chat prototype](./screenshots/score-prototype.png)

## Running app pages

Each screenshot below is from the running Next.js app. These pages share the updated global theme and provide the available route-level views.

### Landing page

![Running app landing page](./screenshots/landing-app.png)

### Contact

![Running app contact page](./screenshots/contact-app.png)

### API docs

![Running app docs page](./screenshots/docs-app.png)

### Privacy

![Running app privacy page](./screenshots/privacy-app.png)

### Terms

![Running app terms page](./screenshots/terms-app.png)

### Security

![Running app security page](./screenshots/security-app.png)

### Onboarding

![Running app onboarding page](./screenshots/onboarding-app.png)

### Sign in

![Running app sign-in page](./screenshots/login-app.png)

### Dashboard preview with HOT trend chart

![Running app dashboard preview showing HOT in coral](./screenshots/dashboard-preview-app.png)

## Routes blocked by local sign-in

The live `/people` and `/history` dashboard routes redirect to sign-in in this local preview, so their authenticated app versions could not be captured. Their matching standalone designs are included above, and their React code changes are listed above. The dashboard chart itself is visible in the `/dev/preview` screenshot.
