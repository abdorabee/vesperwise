"use client";

/**
 * Legacy entrypoint — dashboard chrome lives in AppSidebar / SiteHeader.
 * Kept so route inventory tests and any deep imports keep working.
 */
export {
  WORKSPACE_ITEMS,
  BOTTOM_ITEMS,
  CRUMB,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/nav-config";

export { AppSidebar as default } from "@/components/dashboard/app-sidebar";
