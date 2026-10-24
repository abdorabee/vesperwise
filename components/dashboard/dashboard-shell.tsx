"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppFrame } from "@/components/dashboard/shell/app-frame";
import { IconRail } from "@/components/dashboard/shell/icon-rail";
import { ShellListProvider, ShellListSlot } from "@/components/dashboard/shell/shell-list";
import { ShellPanelProvider, ShellPanelSlot } from "@/components/dashboard/shell/shell-panel";
import { ShellStatusProvider } from "@/components/dashboard/shell/shell-status";
import { StatusBar } from "@/components/dashboard/shell/status-bar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
import { useWorkspaceState, WorkspaceStateProvider } from "@/components/dashboard/workspace-state";
import {
  PageContainer,
  type PageContainerSize,
} from "@/components/app-ui/page-primitives";
import type { DbUser } from "@/lib/types";
import { SidebarProvider } from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  creditsRemaining: number;
  plan: DbUser["plan"];
  polarSubscriptionId?: string | null;
  workspaceName?: string | null;
  watchlistCount?: number;
  pipelineHotCount?: number;
  isMockSignals?: boolean;
}

function pageContainerSize(pathname: string): PageContainerSize {
  if (pathname === "/score" || pathname === "/inbox") return "workspace";
  if (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/api-keys" ||
    pathname === "/autopilot"
  ) {
    return "form";
  }
  if (
    pathname === "/dashboard" ||
    pathname === "/pipeline" ||
    pathname === "/history" ||
    pathname === "/people" ||
    pathname === "/watchlist" ||
    pathname === "/lists" ||
    pathname.startsWith("/lists/") ||
    pathname === "/bulk" ||
    pathname === "/billing"
  ) {
    return "wide";
  }
  return "default";
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <WorkspaceStateProvider initialCredits={props.creditsRemaining} plan={props.plan}>
      <DashboardShellFrame {...props} />
    </WorkspaceStateProvider>
  );
}

function DashboardShellFrame({
  children,
  creditsRemaining,
  plan,
  polarSubscriptionId,
  workspaceName,
  watchlistCount,
  pipelineHotCount,
  isMockSignals = false,
}: DashboardShellProps) {
  const workspace = useWorkspaceState();
  const liveCredits = workspace?.creditsRemaining ?? creditsRemaining;
  const livePlan = workspace?.plan ?? plan;
  const pathname = usePathname();
  const containerSize = pageContainerSize(pathname);

  return (
    <SearchProvider>
      <ShellStatusProvider>
        <ShellPanelProvider>
          <ShellListProvider>
            <SidebarProvider
              className="bg-background"
              style={
                {
                  "--sidebar-width": "16rem",
                  "--header-height": "4rem",
                } as React.CSSProperties
              }
            >
              <div className="md:hidden">
                <AppSidebar
                  creditsRemaining={liveCredits}
                  plan={livePlan}
                  workspaceName={workspaceName}
                  watchlistCount={watchlistCount}
                  pipelineHotCount={pipelineHotCount}
                />
              </div>
              <AppFrame
                rail={
                  <IconRail
                    creditsRemaining={liveCredits}
                    plan={livePlan}
                    watchlistCount={watchlistCount}
                    pipelineHotCount={pipelineHotCount}
                  />
                }
                list={<ShellListSlot />}
                panel={<ShellPanelSlot />}
                statusBar={
                  <StatusBar
                    creditsRemaining={liveCredits}
                    plan={livePlan}
                    polarSubscriptionId={polarSubscriptionId}
                    isMockSignals={isMockSignals}
                  />
                }
              >
                <SiteHeader />
                <PageContainer size={containerSize}>{children}</PageContainer>
              </AppFrame>
            </SidebarProvider>
          </ShellListProvider>
        </ShellPanelProvider>
      </ShellStatusProvider>
    </SearchProvider>
  );
}
