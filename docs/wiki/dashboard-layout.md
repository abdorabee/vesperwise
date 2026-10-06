# Dashboard layout

The authenticated shell (`components/dashboard/dashboard-shell.tsx`) has five zones:

| Zone | Component | Notes |
|------|-----------|-------|
| Icon rail (3rem) | `shell/icon-rail.tsx` | Items from `nav-config.ts`, tooltips, count badges, account menu |
| List column (16rem) | `shell/shell-list.tsx` | Filled per page through `<ShellList>`; ⌘B collapses it |
| Main | `SiteHeader` + `PageContainer` | Page content |
| Right panel (22rem / 30rem wide) | `shell/shell-panel.tsx` | Filled per page through `<ShellPanel>`; Esc closes it |
| Status bar (28px) | `shell/status-bar.tsx` | Credits, plan, mock-signals pill, ⌘K; pages post messages with `useShellStatus` |

`AppFrame` (`shell/app-frame.tsx`) lays these out as a CSS grid. Sizes live in `app/shell.css` (`--rail-w`, `--list-w`, `--panel-w`, `--panel-w-wide`, `--statusbar-h`).

## Pages own their column and panel

`ShellList` and `ShellPanel` portal into slots that `AppFrame` renders, so a page can use its own state directly. The frame only opens a column while a page has one mounted.

| Page | List column | Right panel |
|------|-------------|-------------|
| `/score` | Score threads | Score report (company tabs above the chat) |
| `/pipeline` | HOT, then WARM accounts | Account panel + Pipeline tab |
| `/history` | — | Account panel + `Run #` tab for the clicked run |
| `/watchlist` | Watchlist accounts by score | Account panel |
| `/lists`, `/lists/[id]` | Lists | Account panel (list detail rows) |

## Account panel

`components/account-panel/account-panel.tsx` shows the latest stored score for a domain (`GET /api/dashboard/scores/latest`, no credit) with the same Overview / Evidence / Outreach tabs as Score. Pages pass an optional `extraTab` that is shown first.

The open account lives in the URL as `?account=<domain>` (`useAccountParam`), so it survives reloads and can be linked to. Rescore and follow-up questions hand off to `/score`.

## Responsive behaviour

- ≥1280px: right panel docks as a grid column.
- 768–1279px: right panel slides over the main area.
- <768px: rail, list column and status bar are hidden; the sidebar sheet and header menu take over, and the panel opens full screen.

## Render-loop rule

Effects and ref callbacks in shell primitives depend only on stable setters and primitive values, never on a context value they update or on inline callbacks (keep those in refs). The DOM tests in `components/dashboard/shell/*.dom.test.tsx` and `components/account-panel/*.dom.test.tsx` mount these components and fail on "Maximum update depth exceeded".
