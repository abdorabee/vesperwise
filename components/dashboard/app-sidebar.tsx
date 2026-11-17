"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getWorkspaceLabel } from "@/lib/workspace-label";
import { NavGroups } from "@/components/dashboard/sidebar/nav-groups";
import { SidebarFooterContent } from "@/components/dashboard/sidebar/sidebar-footer";
import { SidebarBrandRow, SidebarSearchRow } from "@/components/dashboard/sidebar/sidebar-header";
import type { NavCounts } from "@/components/dashboard/sidebar/nav-counts";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  creditsRemaining: number;
  plan: DbUser["plan"];
  polarSubscriptionId?: string | null;
  workspaceName?: string | null;
  watchlistCount?: number;
  pipelineHotCount?: number;
}

/**
 * The dashboard nav: labeled, grouped and collapsible to icons on desktop, a sheet on phones.
 * Items come from nav-config.ts (NAV_GROUPS); this component only lays them out.
 */
export function AppSidebar({
  creditsRemaining,
  plan,
  polarSubscriptionId,
  workspaceName,
  watchlistCount = 0,
  pipelineHotCount = 0,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user } = useUser();
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const workspaceLabel = getWorkspaceLabel({
    workspaceName,
    fullName: user?.fullName,
    email: user?.primaryEmailAddress?.emailAddress,
  });
  const counts: NavCounts = { hot: pipelineHotCount, watchlist: watchlistCount };

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="vw-sidebar" {...props}>
      <SidebarHeader className="vw-sb-header">
        <SidebarBrandRow workspaceLabel={workspaceLabel} />
        <SidebarSearchRow onOpen={() => setOpenMobile(false)} />
      </SidebarHeader>

      <SidebarContent className="vw-sb-content">
        <NavGroups pathname={pathname} counts={counts} />
      </SidebarContent>

      <SidebarFooter className="vw-sb-footer-wrap">
        <SidebarFooterContent
          pathname={pathname}
          creditsRemaining={creditsRemaining}
          creditCap={creditCap}
          plan={plan}
          polarSubscriptionId={polarSubscriptionId}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

export { WORKSPACE_ITEMS, BOTTOM_ITEMS } from "@/components/dashboard/nav-config";
