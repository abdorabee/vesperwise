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
import { BOTTOM_ITEMS, WORKSPACE_ITEMS, isNavActive, type NavItem } from "@/components/dashboard/nav-config";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  creditsRemaining: number;
  plan: DbUser["plan"];
  workspaceName?: string | null;
  inboxCount?: number;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

function navCount(
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

export function AppSidebar({
  creditsRemaining,
  plan,
  workspaceName,
  inboxCount = 0,
  watchlistCount = 0,
  pipelineHotCount = 0,
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

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={workspaceLabel}>
              <Link href="/dashboard">
                <VesperWiseLogo className="size-8 shrink-0" size={28} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">VesperWise</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {workspaceLabel} · {plan}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Search" onClick={openSearch}>
              <Search />
              <span>Search</span>
              <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground tabular-nums group-data-[collapsible=icon]:hidden sm:flex">
                ⌘K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                const count = navCount(item, counts);
                return (
                  <SidebarMenuItem key={`${item.href}-${item.label}`}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon
                          className={cn(active && "text-[var(--brand)]")}
                        />
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {BOTTOM_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon className={cn(active && "text-[var(--brand)]")} />
                        <span>{item.label}</span>
                        {item.comingSoon ? (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
                            Soon
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="mx-2 mb-1 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 group-data-[collapsible=icon]:hidden">
          <div className="text-[11px] text-muted-foreground">Credits this month</div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <div className="text-sm tabular-nums">
              <span className="font-medium text-sidebar-accent-foreground">
                {creditsRemaining.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / {creditCap.toLocaleString()}</span>
            </div>
            <Link
              href="/billing"
              className="text-[11px] font-medium text-sidebar-accent-foreground underline-offset-2 hover:underline"
            >
              Top up
            </Link>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${creditPct}%` }}
            />
          </div>
        </div>
        <div
          className="mx-2 mb-1 hidden rounded-md border border-sidebar-border px-1 py-2 text-center text-[11px] tabular-nums text-sidebar-accent-foreground group-data-[collapsible=icon]:block"
          title={`${creditsRemaining} credits`}
        >
          {creditsRemaining}
        </div>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** @deprecated Prefer AppSidebar — kept for nav.test.ts route inventory */
export { WORKSPACE_ITEMS, BOTTOM_ITEMS };
