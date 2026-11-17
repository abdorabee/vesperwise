"use client";

import Link from "next/link";
import { PanelLeft, PanelLeftClose, Search } from "lucide-react";
import { BrandMark } from "@/components/dashboard/brand-mark";
import { SidebarTooltip } from "@/components/dashboard/sidebar/nav-item";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import { useSidebar } from "@/components/ui/sidebar";
import { shortcutLabel, useModKey } from "@/lib/use-mod-key";

export function SidebarBrandRow({ workspaceLabel }: { workspaceLabel: string }) {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const ToggleIcon = collapsed ? PanelLeft : PanelLeftClose;
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <div className="vw-sb-brandrow" data-slot="sidebar-brand-row">
      <SidebarTooltip label="VesperWise">
        <Link href="/dashboard" className="vw-sb-brand" title={workspaceLabel} aria-label="VesperWise dashboard">
          <BrandMark className="size-6" />
          <span className="vw-sb-brand__word">VesperWise</span>
        </Link>
      </SidebarTooltip>
      {isMobile ? null : (
        <button
          type="button"
          className="vw-sb-toggle"
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          aria-keyshortcuts="Control+B Meta+B"
          onClick={toggleSidebar}
        >
          <ToggleIcon className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function SidebarSearchRow({ onOpen }: { onOpen?: () => void }) {
  const { open } = useDashboardSearch();
  const modKey = useModKey();
  const hint = shortcutLabel(modKey, "K");

  return (
    <SidebarTooltip label={`Search · ${hint}`}>
      <button
        type="button"
        className="vw-sb-search"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => {
          onOpen?.();
          open();
        }}
      >
        <Search className="vw-sb-item__icon" aria-hidden="true" />
        <span className="vw-sb-item__label">Search</span>
        <kbd aria-hidden="true" className="vw-sb-kbd kbd-hint">
          {hint}
        </kbd>
      </button>
    </SidebarTooltip>
  );
}
