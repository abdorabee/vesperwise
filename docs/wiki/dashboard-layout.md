# Dashboard layout

The authenticated shell (`components/dashboard/dashboard-shell.tsx`) has five zones:

| Zone | Component | Notes |
|------|-----------|-------|
| Sidebar (15rem, or 3rem collapsed to icons) | `app-sidebar.tsx` + `sidebar/*` | Grouped, labeled nav from `NAV_GROUPS` in `nav-config.ts`, search row, credits + plan, Settings, account menu |
| List column (16rem) | `shell/shell-list.tsx` | Filled per page through `<ShellList>`; its header button collapses it and the page header shows a button to reopen it (its own state, see below) |
| Main | `SiteHeader` (56px) + `PageContainer` | Page content; the header shows the page title (a parent link only for real hierarchies such as Lists › a list) |
| Right panel (22rem / 30rem wide) | `shell/shell-panel.tsx` | Filled per page through `<ShellPanel>`; Esc closes it |
| Status bar (28px) | `shell/status-bar.tsx` | Page status, low-credit warning, mock-signals pill, search hint; pages post messages with `useShellStatus` |

`AppFrame` (`shell/app-frame.tsx`) lays these out as a CSS grid. Sizes live in `app/shell.css`: `--sidebar-w` on the frame (15rem, or `--rail-w` when `data-sidebar-state="collapsed"`), `--rail-w` (collapsed width), `--list-w`, `--panel-w`, `--panel-w-wide`, `--statusbar-h`. The sidebar sits in the frame's first grid cell (`data-slot="app-frame-rail"`).

## Sidebar

One nav definition (`NAV_GROUPS`: Overview, Library, Workspace) feeds the desktop sidebar, the mobile sheet and the search palette's Pages list. Chat is not a destination: it is the Score composer. `/score#chat` deep links (`lib/score-chat.ts`) still land there, and Score is active with or without the hash.

- **Expanded** (15rem): labels, group headings, count text (a HOT pill on Intent Hub, a plain count on Watchlist), a search row with the shortcut hint, credits and plan linking to `/billing`, Settings, and the account menu. The active item has a soft surface and a 2px lime bar on its left edge.
- **Collapsed** (3rem): icons only, tooltips on the right after 300ms, counts as a dot on the icon.
- **State**: `SidebarProvider` stores the choice in the `sidebar_state` cookie. `app/(dashboard)/layout.tsx` reads it and passes `defaultOpen`, so it survives reloads (no cookie means expanded).
- **Shortcuts**: Ctrl/⌘+B toggles the sidebar and Ctrl/⌘+K opens search. Hints use `useModKey` (`lib/use-mod-key.ts`), which renders `Ctrl` on the server and switches to ⌘ on Apple platforms after mount.
- **Phones**: below 768px the same component renders as a sheet opened from the header.

The list column does not depend on the sidebar. `ShellListProvider` owns an `expanded` flag (default open, never persisted) that `AppFrame`, the list's collapse button and `ShellListReopenButton` read.

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
- <768px: sidebar column, list column and status bar are hidden; the sidebar sheet and header menu take over, and the panel opens full screen.

## Render-loop rule

Effects and ref callbacks in shell primitives depend only on stable setters and primitive values, never on a context value they update or on inline callbacks (keep those in refs). The DOM tests in `components/dashboard/shell/*.dom.test.tsx` and `components/account-panel/*.dom.test.tsx` mount these components and fail on "Maximum update depth exceeded".
