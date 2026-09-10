import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Flame,
  Gauge,
  History,
  UserSearch,
  Eye,
  Zap,
  Inbox,
  CreditCard,
  Key,
  List,
  Upload,
  BrainCircuit,
  Settings,
} from "lucide-react";

export type SearchResultKind = "page" | "company" | "person" | "watchlist" | "list" | "action";

export interface SearchNavItem {
  id: string;
  kind: "page";
  label: string;
  href: string;
  keywords: string;
  icon: LucideIcon;
}

export interface SearchResultItem {
  id: string;
  kind: SearchResultKind;
  label: string;
  sublabel?: string;
  href: string;
  meta?: string;
  band?: "HOT" | "WARM" | "COLD" | null;
}

export const SEARCH_NAV_ITEMS: SearchNavItem[] = [
  { id: "dashboard", kind: "page", label: "Dashboard", href: "/dashboard", keywords: "home overview", icon: LayoutGrid },
  { id: "pipeline", kind: "page", label: "Intent Hub", href: "/pipeline", keywords: "pipeline intent hub deals", icon: Flame },
  { id: "score", kind: "page", label: "Score", href: "/score", keywords: "score company domain lookup", icon: Gauge },
  { id: "history", kind: "page", label: "History", href: "/history", keywords: "history runs past scores", icon: History },
  { id: "people", kind: "page", label: "People", href: "/people", keywords: "people contacts person scoring", icon: UserSearch },
  { id: "watchlist", kind: "page", label: "Watchlist", href: "/watchlist", keywords: "watchlist monitor accounts", icon: Eye },
  { id: "lists", kind: "page", label: "Lists", href: "/lists", keywords: "lists segments accounts", icon: List },
  { id: "bulk", kind: "page", label: "Bulk Score", href: "/bulk", keywords: "bulk csv upload score companies", icon: Upload },
  { id: "autopilot", kind: "page", label: "Autopilot", href: "/autopilot", keywords: "autopilot workflows automation", icon: Zap },
  { id: "inbox", kind: "page", label: "Inbox", href: "/inbox", keywords: "inbox notifications messages alerts", icon: Inbox },
  // "memory" stays in the keywords so anyone who learned the old name still lands here.
  { id: "settings-profile", kind: "page", label: "Business Profile", href: "/settings/profile", keywords: "profile memory settings business profile icp industries", icon: BrainCircuit },
  { id: "settings-account", kind: "page", label: "Settings", href: "/settings/account", keywords: "settings account workspace name role preferences", icon: Settings },
  { id: "billing", kind: "page", label: "Billing", href: "/billing", keywords: "billing credits plan invoice", icon: CreditCard },
  { id: "api-keys", kind: "page", label: "API Keys", href: "/api-keys", keywords: "api keys developer token", icon: Key },
];

export function filterNavItems(query: string): SearchNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SEARCH_NAV_ITEMS;
  return SEARCH_NAV_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      item.href.toLowerCase().includes(q),
  );
}

export function getNavItem(id: string): SearchNavItem | undefined {
  return SEARCH_NAV_ITEMS.find((item) => item.id === id);
}

export const SEARCH_OPEN_EVENT = "dashboard-search-open";

export function openDashboardSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SEARCH_OPEN_EVENT));
  }
}
