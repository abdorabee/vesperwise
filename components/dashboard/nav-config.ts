import type { ComponentType } from "react";
import {
  LayoutGrid,
  Flame,
  Gauge,
  History,
  UserSearch,
  Eye,
  ListChecks,
  Upload,
  Zap,
  Inbox,
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
  beta?: boolean;
  comingSoon?: boolean;
}

/** Primary work — dashboard-01 NavMain */
export const NAV_MAIN: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/pipeline", label: "Intent Hub", icon: Flame, hotCount: true },
  { href: "/score", label: "Score", icon: Gauge },
  { href: "/people", label: "People", icon: UserSearch, beta: true },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

/** Secondary library — dashboard-01 Documents group */
export const NAV_LIBRARY: NavItem[] = [
  { href: "/history", label: "History", icon: History },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/bulk", label: "Bulk Score", icon: Upload },
  { href: "/autopilot", label: "Autopilot", icon: Zap, comingSoon: true },
];

/** Footer secondary — dashboard-01 NavSecondary */
export const NAV_SECONDARY: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/api-keys", label: "API Keys", icon: Key, comingSoon: true },
];

export const WORKSPACE_ITEMS: NavItem[] = [...NAV_MAIN, ...NAV_LIBRARY];
export const BOTTOM_ITEMS: NavItem[] = NAV_SECONDARY;

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

export const HELP_ITEM: NavItem = {
  href: "/docs",
  label: "Get Help",
  icon: CircleHelp,
};
