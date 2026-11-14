import type { ComponentType } from "react";
import {
  LayoutGrid,
  Activity,
  Gauge,
  History,
  Eye,
  ListChecks,
  Upload,
  CreditCard,
  Key,
  Settings,
  CircleHelp,
} from "lucide-react";

/** Which live counter, if any, a nav item shows next to its label. */
export type NavCountKind = "hot" | "watchlist";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: NavCountKind;
}

export interface NavGroup {
  id: "overview" | "library" | "workspace";
  label: string;
  items: NavItem[];
}

/**
 * The one nav definition. The desktop sidebar, the mobile sheet and the search palette's
 * Pages list all derive from this.
 *
 * People, Inbox and Autopilot are unfinished: their routes stay reachable by URL (and stay
 * auth-protected in lib/route-access.ts) but they are intentionally absent from the nav and ⌘K.
 * Chat is not a destination: it is the Score composer, so `/score#chat` deep links
 * (lib/score-chat.ts) land on Score.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/pipeline", label: "Intent Hub", icon: Activity, count: "hot" },
      { href: "/score", label: "Score", icon: Gauge },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      { href: "/history", label: "History", icon: History },
      { href: "/watchlist", label: "Watchlist", icon: Eye, count: "watchlist" },
      { href: "/lists", label: "Lists", icon: ListChecks },
      { href: "/bulk", label: "Bulk Score", icon: Upload },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [{ href: "/api-keys", label: "API Keys", icon: Key }],
  },
];

function groupItems(id: NavGroup["id"]): NavItem[] {
  return NAV_GROUPS.find((group) => group.id === id)?.items ?? [];
}

/** Primary work. */
export const NAV_MAIN: NavItem[] = groupItems("overview");

/** Flattened library routes retained for deep imports. */
export const NAV_LIBRARY: NavItem[] = groupItems("library");

/** Workspace group (developer tools). */
export const NAV_SECONDARY: NavItem[] = groupItems("workspace");

export const HELP_ITEM: NavItem = {
  href: "/docs",
  label: "Get Help",
  icon: CircleHelp,
};

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

export const ACCOUNT_ITEMS: NavItem[] = [
  SETTINGS_ITEM,
  { href: "/billing", label: "Billing", icon: CreditCard },
  HELP_ITEM,
];

export const WORKSPACE_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
export const BOTTOM_ITEMS: NavItem[] = ACCOUNT_ITEMS;

/**
 * Page titles for the header. `parent` is set only for real hierarchies (Settings sections);
 * top-level pages show just their own title.
 */
export const CRUMB: Record<string, { parent?: string; current: string }> = {
  "/dashboard": { current: "Dashboard" },
  "/settings/profile": { parent: "Settings", current: "Business profile" },
  "/settings/account": { parent: "Settings", current: "Account" },
  "/pipeline": { current: "Intent Hub" },
  "/people": { current: "People" },
  "/history": { current: "History" },
  "/watchlist": { current: "Watchlist" },
  "/lists": { current: "Lists" },
  "/autopilot": { current: "Autopilot" },
  "/bulk": { current: "Bulk" },
  "/billing": { current: "Billing" },
  "/api-keys": { current: "API Keys" },
  "/score": { current: "Score" },
  "/settings": { current: "Settings" },
  "/inbox": { current: "Inbox" },
  "/dev/shell": { current: "Shell preview" },
};

/**
 * Whether a nav item is the current page. A hash in `href` still pins the match to that
 * hash; `hash` itself no longer matters for plain paths, so Score is active with or
 * without `#chat`.
 */
export function isNavActive(pathname: string, href: string, hash = ""): boolean {
  const hashIndex = href.indexOf("#");
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hrefHash = hashIndex === -1 ? "" : href.slice(hashIndex);
  if (hrefHash) return pathname === path && hash === hrefHash;
  return pathname === path || (path !== "/dashboard" && pathname.startsWith(`${path}/`));
}
