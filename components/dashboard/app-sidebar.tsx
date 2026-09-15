"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getWorkspaceLabel } from "@/lib/workspace-label";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import VesperWiseLogo from "@/components/vesperwise-logo";
import {
  HELP_ITEM,
  NAV_LIBRARY,
  NAV_MAIN,
  NAV_SECONDARY,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/nav-config";
import { NavUser } from "@/components/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  creditsRemaining: number;
  plan: DbUser["plan"];
  workspaceName?: string | null;
  inboxCount?: number;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

function itemCount(
  item: NavItem,
  counts: { inbox?: number; watchlist?: number; pipelineHot?: number }
): string | undefined {
  if (item.href === "/inbox" && counts.inbox && counts.inbox > 0) return String(counts.inbox);
  if (item.href === "/pipeline" && counts.pipelineHot && counts.pipelineHot > 0) {
    return String(counts.pipelineHot);
  }
  if (item.href === "/watchlist" && counts.watchlist && counts.watchlist > 0) {
    return String(counts.watchlist);
  }
  return undefined;
}

function NavRow({
  item,
  pathname,
  counts,
}: {
  item: NavItem;
  pathname: string;
  counts: { inbox?: number; watchlist?: number; pipelineHot?: number };
}) {
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href);
  const count = itemCount(item, counts);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href}>
          <Icon className={cn(active && "text-[var(--brand)]")} />
          <span>{item.label}</span>
          {item.comingSoon ? (
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
              Soon
            </span>
          ) : null}
          {item.beta && !item.comingSoon ? (
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
              Beta
            </span>
          ) : null}
        </Link>
      </SidebarMenuButton>
      {count ? (
        <SidebarMenuBadge
          className={cn(
            "tabular-nums",
            item.hotCount && "bg-[var(--hot-bg)] text-[var(--hot)]"
          )}
        >
          {count}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  creditsRemaining,
  plan,
  workspaceName,
  inboxCount = 0,
  watchlistCount = 0,
  pipelineHotCount = 0,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { open: openSearch } = useDashboardSearch();
  const { user } = useUser();
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const creditPct =
    creditCap > 0 ? Math.min(100, Math.round((creditsRemaining / creditCap) * 100)) : 0;
  const workspaceLabel = getWorkspaceLabel({
    workspaceName,
    fullName: user?.fullName,
    email: user?.primaryEmailAddress?.emailAddress,
  });
  const counts = { inbox: inboxCount, watchlist: watchlistCount, pipelineHot: pipelineHotCount };
  const HelpIcon = HELP_ITEM.icon;

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              tooltip="VesperWise"
            >
              <Link href="/dashboard">
                <VesperWiseLogo className="size-5!" size={20} />
                <span className="text-base font-semibold">VesperWise</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map((item) => (
                <NavRow
                  key={`${item.href}-${item.label}`}
                  item={item}
                  pathname={pathname}
                  counts={counts}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_LIBRARY.map((item) => (
                <NavRow
                  key={`${item.href}-${item.label}`}
                  item={item}
                  pathname={pathname}
                  counts={counts}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_SECONDARY.map((item) => (
                <NavRow
                  key={`${item.href}-${item.label}`}
                  item={item}
                  pathname={pathname}
                  counts={counts}
                />
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Search" onClick={openSearch}>
                  <Search />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={HELP_ITEM.label}>
                  <Link href={HELP_ITEM.href}>
                    <HelpIcon />
                    <span>{HELP_ITEM.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="mx-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">Credits</span>
            <Link
              href="/billing"
              className="font-medium text-sidebar-accent-foreground underline-offset-2 hover:underline"
            >
              Top up
            </Link>
          </div>
          <div className="mt-1 text-sm tabular-nums">
            <span className="font-medium text-sidebar-accent-foreground">
              {creditsRemaining.toLocaleString()}
            </span>
            <span className="text-muted-foreground"> / {creditCap.toLocaleString()}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-sidebar-border">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${creditPct}%` }}
            />
          </div>
          <div className="mt-1 truncate text-[10px] text-muted-foreground">
            {workspaceLabel} · {plan}
          </div>
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { WORKSPACE_ITEMS, BOTTOM_ITEMS } from "@/components/dashboard/nav-config";
