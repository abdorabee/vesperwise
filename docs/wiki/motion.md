# Motion

VesperWise is a work tool. People click the same rows, tabs and menus hundreds of times a day, so motion that only replays something they already know just makes them wait. The default is **no animation**.

## Animate only when

| Case | Examples |
|------|----------|
| The user can toggle a panel, and motion shows where it lives | List column collapse (⌘B), right panel slide-in (`shell/shell-panel.tsx`) |
| Motion fills a real wait | Fresh-score count-up and row stagger (`data-motion="generated"`), research status orb, tool-chip spinners, bulk upload progress |
| A short exit or confirmation | Menu fade-out (100ms), copy→check swap, button press scale |

## Never animate

- Route changes between dashboard pages.
- Restored content: switching account rows (`data-motion="restored"`), opening an old Score thread (`.score-message[data-restored]`). The old thread stays visible while the new one loads, and the status bar shows the orb.
- Menu, select or hover-card **entry**. They open instantly and fade out briefly.
- Tab switches and hover lifts on rows or dashboard KPIs.
- Keyboard-initiated actions that open a menu, palette or dialog (⌘K). The user already knows what will happen. ⌘B is the exception because the list column is a panel.

## Easing and timing

Tokens live in `app/motion.css`.

| Movement | Easing | Duration |
|----------|--------|----------|
| Enter or exit | `--ease-out` | `--dur-fast` (180ms) or less |
| Moving something already on screen | `--ease-in-out` | `--dur-base` (240ms) or less |
| Panels and drawers | `--ease-drawer` | 140–240ms |

Never use `ease-in` or `linear` for UI. Linear is only for spinners.

## Tooltips

`TooltipProvider` waits 400ms before the first tooltip, then skips the delay for 300ms. Moving across the icon rail shows each label instantly. Only `delayed-open` tooltips fade in. `instant-open` ones appear with no motion.

## Reduced motion

Every animation must stop under `prefers-reduced-motion: reduce`. A global rule in `app/globals.css` covers this.

`components/ui/motion-policy.test.ts` and `components/score/score-motion.test.ts` enforce these rules.
