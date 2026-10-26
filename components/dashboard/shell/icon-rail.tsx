"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { Search } from "lucide-react";
import { BrandMark } from "@/components/dashboard/brand-mark";
import { NavUser } from "@/components/dashboard/nav-user";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import {
  ACCOUNT_ITEMS,
  NAV_LIBRARY,
  NAV_MAIN,
  NAV_SECONDARY,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/nav-config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { followScoreChatLink, followScoreLink } from "@/lib/score-chat";
import { useLocationHash } from "@/lib/use-location-hash";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { cn } from "@/lib/utils";

interface IconRailProps {
  creditsRemaining: number;
  plan: DbUser["plan"];
  polarSubscriptionId?: string | null;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

const SETTINGS_ITEM = ACCOUNT_ITEMS.find((item) => item.href === "/settings") ?? ACCOUNT_ITEMS[0];

function displayCount(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : String(count);
}

function countForItem(
  item: NavItem,
  counts: { watchlist: number; pipelineHot: number }
): string | undefined {
  if (item.href === "/pipeline") return displayCount(counts.pipelineHot);
  if (item.href === "/watchlist") return displayCount(counts.watchlist);
  return undefined;
}

function RailTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function RailLink({
  item,
  pathname,
  hash,
  count,
}: {
  item: NavItem;
  pathname: string;
  hash: string;
  count?: string;
}) {
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href, hash);
  const tour = item.label === "Chat" ? "chat" : undefined;

  return (
    <RailTooltip label={item.label}>
      <Link
        href={item.href}
        scroll={tour ? false : undefined}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        data-active={active}
        data-tour={tour}
        className="dashboard-rail-button"
        onClick={(event) => {
          if (item.href === "/score#chat") followScoreChatLink(event);
          else if (item.href === "/score") followScoreLink(event);
        }}
      >
        <Icon className="size-4" />
        <span className="sr-only">{item.label}</span>
        {count ? (
          <span
            data-slot="rail-badge"
            data-hot={item.hotCount ? "true" : undefined}
            className="dashboard-rail-badge"
          >
            {count}
          </span>
        ) : null}
      </Link>
    </RailTooltip>
  );
}

export function IconRail({
  creditsRemaining,
  plan,
  polarSubscriptionId,
  watchlistCount = 0,
  pipelineHotCount = 0,
}: IconRailProps) {
  const pathname = usePathname();
  const hash = useLocationHash();
  const { open: openSearch } = useDashboardSearch();
  const counts = { watchlist: watchlistCount, pipelineHot: pipelineHotCount };
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;

  return (
    <nav data-slot="icon-rail" className="dashboard-icon-rail" aria-label="Dashboard">
      <RailTooltip label="VesperWise">
        <Link href="/dashboard" aria-label="VesperWise dashboard" className="dashboard-rail-brand">
          <BrandMark className="size-8" />
        </Link>
      </RailTooltip>

      <div className="dashboard-icon-rail__nav" aria-label="Workspace navigation">
        {[...NAV_MAIN, ...NAV_LIBRARY, ...NAV_SECONDARY].map((item) => (
          <RailLink
            key={item.href}
            item={item}
            pathname={pathname}
            hash={hash}
            count={countForItem(item, counts)}
          />
        ))}
        <RailTooltip label="Search">
          <button
            type="button"
            aria-label="Search"
            className={cn("dashboard-rail-button", "dashboard-rail-button--search")}
            onClick={openSearch}
          >
            <Search className="size-4" />
            <span className="sr-only">Search</span>
          </button>
        </RailTooltip>
      </div>

      <div className="dashboard-icon-rail__spacer" />
      <div data-slot="icon-rail-separator" className="dashboard-icon-rail__separator" />
      <div className="dashboard-icon-rail__bottom">
        <RailLink item={SETTINGS_ITEM} pathname={pathname} hash={hash} />
        <NavUser creditsRemaining={creditsRemaining} creditCap={creditCap} plan={plan} polarSubscriptionId={polarSubscriptionId} variant="rail" />
      </div>
    </nav>
  );
}
