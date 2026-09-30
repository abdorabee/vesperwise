"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getWorkspaceLabel } from "@/lib/workspace-label";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import {
  NAV_LIBRARY_CLUSTERS,
  NAV_MAIN,
  NAV_SECONDARY,
  isNavActive,
  type NavCluster,
  type NavItem,
} from "@/components/dashboard/nav-config";
import { NavUser, SidebarCredits } from "@/components/dashboard/nav-user";
import { BrandMark } from "@/components/dashboard/brand-mark";
import VesperWiseLogo from "@/components/vesperwise-logo";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  creditsRemaining: number;
  plan: DbUser["plan"];
  workspaceName?: string | null;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

type NavCounts = { watchlist?: number; pipelineHot?: number };

function itemCount(
  item: NavItem,
  counts: NavCounts
): string | undefined {
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
  counts: NavCounts;
}) {
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href);
  const count = itemCount(item, counts);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link href={item.href}>
          <Icon />
          <span>{item.label}</span>
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

function NavClusterRow({
  cluster,
  pathname,
  counts,
}: {
  cluster: NavCluster;
  pathname: string;
  counts: NavCounts;
}) {
  const Icon = cluster.icon;
  const active = cluster.children.some((item) => isNavActive(pathname, item.href));

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={active} tooltip={cluster.label}>
            <Icon className="size-4" />
            <span>{cluster.label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 motion-reduce:transition-none" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {cluster.children.map((item) => {
              const count = itemCount(item, counts);
              return (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton asChild isActive={isNavActive(pathname, item.href)}>
                    <Link href={item.href}>
                      <span>{item.label}</span>
                      {count ? (
                        <span className="ml-auto tabular-nums text-muted-foreground">
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({
  creditsRemaining,
  plan,
  workspaceName,
  watchlistCount = 0,
  pipelineHotCount = 0,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { open: openSearch } = useDashboardSearch();
  const { setOpenMobile } = useSidebar();
  const { user } = useUser();
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const workspaceLabel = getWorkspaceLabel({
    workspaceName,
    fullName: user?.fullName,
    email: user?.primaryEmailAddress?.emailAddress,
  });
  const counts: NavCounts = { watchlist: watchlistCount, pipelineHot: pipelineHotCount };
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="VesperWise"
            >
              <Link href="/dashboard">
                {/* Wordmark when expanded; the "VW" tile only in the collapsed icon rail. Visibility
                    lives on wrappers: globals.css `img, svg { display: block }` is unlayered and
                    would beat a `hidden` utility on the image or svg itself. */}
                <span className="shrink-0 group-data-[collapsible=icon]:hidden">
                  <VesperWiseLogo size={26} className="rounded-md" />
                </span>
                <span className="hidden shrink-0 group-data-[collapsible=icon]:inline-flex">
                  <BrandMark />
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-xs font-normal text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {workspaceLabel}
                </span>
                <Badge
                  variant="outline"
                  data-slot="plan-badge"
                  className="min-h-5 px-2 py-0 text-[11px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden"
                >
                  {planLabel}
                </Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
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

          <SidebarGroup>
            <SidebarGroupLabel>Library</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_LIBRARY_CLUSTERS.map((cluster) => (
                  <NavClusterRow
                    key={cluster.label}
                    cluster={cluster}
                    pathname={pathname}
                    counts={counts}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
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
                  <SidebarMenuButton
                    tooltip="Search"
                    onClick={() => {
                      setOpenMobile(false);
                      openSearch();
                    }}
                  >
                    <Search />
                    <span>Search</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <SidebarCredits creditsRemaining={creditsRemaining} creditCap={creditCap} plan={plan} />
        <NavUser creditsRemaining={creditsRemaining} creditCap={creditCap} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { WORKSPACE_ITEMS, BOTTOM_ITEMS } from "@/components/dashboard/nav-config";
