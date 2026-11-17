import type { ComponentType } from "react";
import { BrainCircuit, CreditCard, Settings } from "lucide-react";
import { NAV_GROUPS } from "@/components/dashboard/nav-config";

export type SearchResultKind = "page" | "company" | "person" | "watchlist" | "list" | "action";

export interface SearchNavItem {
  id: string;
  kind: "page";
  label: string;
  href: string;
  keywords: string;
  icon: ComponentType<{ className?: string }>;
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

/** Search-only keywords per nav page, keyed by the route slug (`/api-keys` -> `api-keys`). */
const NAV_KEYWORDS: Record<string, string> = {
  dashboard: "home overview",
  pipeline: "pipeline intent hub deals",
  // Chat is the Score composer, so its old keywords live here.
  score: "score company domain lookup chat copilot ask why hot thread",
  history: "history runs past scores",
  watchlist: "watchlist monitor accounts",
  lists: "lists segments accounts",
  bulk: "bulk csv upload score companies",
  "api-keys": "api keys developer token",
};

/** Pages from the shared nav config (People, Inbox and Autopilot stay hidden until they ship). */
const NAV_PAGE_ITEMS: SearchNavItem[] = NAV_GROUPS.flatMap((group) => group.items).map((item) => {
  const id = item.href.replace(/^\//, "");
  return { id, kind: "page", label: item.label, href: item.href, keywords: NAV_KEYWORDS[id] ?? "", icon: item.icon };
});

function navPage(id: string): SearchNavItem[] {
  return NAV_PAGE_ITEMS.filter((item) => item.id === id);
}

// Settings pages are not sidebar destinations (they live in the account menu), so they are added here.
// "memory" stays in the keywords so anyone who learned the old name still lands here.
export const SEARCH_NAV_ITEMS: SearchNavItem[] = [
  ...NAV_PAGE_ITEMS.filter((item) => item.id !== "api-keys"),
  { id: "settings-profile", kind: "page", label: "Business Profile", href: "/settings/profile", keywords: "profile memory settings business profile icp industries", icon: BrainCircuit },
  { id: "settings-account", kind: "page", label: "Settings", href: "/settings/account", keywords: "settings account workspace name role preferences", icon: Settings },
  { id: "billing", kind: "page", label: "Billing", href: "/billing", keywords: "billing credits plan invoice", icon: CreditCard },
  ...navPage("api-keys"),
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
