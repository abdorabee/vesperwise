"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { isNavActive, type NavItem } from "@/components/dashboard/nav-config";
import { formatNavCount, navCountSentence, type NavCounts } from "@/components/dashboard/sidebar/nav-counts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { followScoreLink } from "@/lib/score-chat";

interface SidebarTooltipProps {
  label: ReactNode;
  children: ReactNode;
}

/** Right-hand tooltip that only shows while the sidebar is collapsed to icons. */
export function SidebarTooltip({ label, children }: SidebarTooltipProps) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={8} hidden={!collapsed}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

interface NavItemLinkProps {
  item: NavItem;
  pathname: string;
  counts: NavCounts;
}

export function NavItemLink({ item, pathname, counts }: NavItemLinkProps) {
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href);
  const count = item.count ? counts[item.count] : 0;
  const text = formatNavCount(count);
  const sentence = item.count && count > 0 ? navCountSentence(item.count, count) : undefined;

  return (
    <li data-slot="sidebar-menu-item" className="vw-sb-li">
      <SidebarTooltip label={sentence ? `${item.label} · ${sentence}` : item.label}>
        <Link
          href={item.href}
          className="vw-sb-item"
          data-active={active}
          aria-current={active ? "page" : undefined}
          onClick={(event) => {
            if (item.href === "/score") followScoreLink(event);
          }}
        >
          <Icon className="vw-sb-item__icon" />
          <span className="vw-sb-item__label">{item.label}</span>
          {text ? (
            <>
              <span aria-hidden="true" data-kind={item.count} className="vw-sb-count">
                {text}
              </span>
              <span aria-hidden="true" data-slot="rail-badge" data-kind={item.count} className="vw-sb-dot" />
              <span className="sr-only">, {sentence}</span>
            </>
          ) : null}
        </Link>
      </SidebarTooltip>
    </li>
  );
}
