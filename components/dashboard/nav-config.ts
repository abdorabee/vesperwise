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
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  hotCount?: boolean;
  beta?: boolean;
  comingSoon?: boolean;
}

export const WORKSPACE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/pipeline", label: "Intent Hub", icon: Flame, hotCount: true },
  { href: "/score", label: "Score", icon: Gauge },
  { href: "/history", label: "History", icon: History },
  { href: "/people", label: "People", icon: UserSearch, beta: true },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/bulk", label: "Bulk Score", icon: Upload },
  { href: "/autopilot", label: "Autopilot", icon: Zap, comingSoon: true },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

export const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/api-keys", label: "API Keys", icon: Key, comingSoon: true },
];

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
};

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
