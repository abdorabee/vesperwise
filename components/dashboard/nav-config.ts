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

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  hotCount?: boolean;
}

export interface NavCluster {
  label: string;
  icon: NavItem["icon"];
  children: NavItem[];
}

/** Primary work — dashboard-01 NavMain */
export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/pipeline", label: "Intent Hub", icon: Activity, hotCount: true },
  { href: "/score", label: "Score", icon: Gauge },
];

/**
 * People, Inbox and Autopilot are unfinished: their routes stay reachable by URL (and stay
 * auth-protected in lib/route-access.ts) but they are intentionally absent from the nav and ⌘K.
 */

/** Flattened library routes retained for command palettes and deep imports. */
export const NAV_LIBRARY: NavItem[] = [
  { href: "/history", label: "History", icon: History },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/bulk", label: "Bulk Score", icon: Upload },
];

export const NAV_LIBRARY_CLUSTERS: NavCluster[] = [
  {
    label: "Saved accounts",
    icon: ListChecks,
    children: [NAV_LIBRARY[1], NAV_LIBRARY[2]],
  },
  {
    label: "Score activity",
    icon: History,
    children: [NAV_LIBRARY[0], NAV_LIBRARY[3]],
  },
];

/** Workspace group (developer tools). */
export const NAV_SECONDARY: NavItem[] = [
  { href: "/api-keys", label: "API Keys", icon: Key },
];

export const HELP_ITEM: NavItem = {
  href: "/docs",
  label: "Get Help",
  icon: CircleHelp,
};

export const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
  HELP_ITEM,
];

export const WORKSPACE_ITEMS: NavItem[] = [
  ...NAV_MAIN,
  ...NAV_LIBRARY,
  ...NAV_SECONDARY,
];
export const BOTTOM_ITEMS: NavItem[] = ACCOUNT_ITEMS;

export const CRUMB: Record<string, { parent: string; current: string }> = {
  "/dashboard": { parent: "Workspace", current: "Dashboard" },
  "/settings/profile": { parent: "Settings", current: "Business profile" },
  "/settings/account": { parent: "Settings", current: "Account" },
  "/pipeline": { parent: "Workspace", current: "Intent Hub" },
  "/people": { parent: "Workspace", current: "People" },
  "/history": { parent: "Workspace", current: "History" },
  "/watchlist": { parent: "Workspace", current: "Watchlist" },
  "/lists": { parent: "Workspace", current: "Lists" },
  "/autopilot": { parent: "Workspace", current: "Autopilot" },
  "/bulk": { parent: "Workspace", current: "Bulk" },
  "/billing": { parent: "Workspace", current: "Billing" },
  "/api-keys": { parent: "Workspace", current: "API Keys" },
  "/score": { parent: "Workspace", current: "Score" },
  "/settings": { parent: "Workspace", current: "Settings" },
  "/inbox": { parent: "Workspace", current: "Inbox" },
  "/dev/shell": { parent: "Workspace", current: "Shell preview" },
};

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
