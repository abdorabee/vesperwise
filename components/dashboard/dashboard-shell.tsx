"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
import {
  PageContainer,
  type PageContainerSize,
} from "@/components/app-ui/page-primitives";
import type { DbUser } from "@/lib/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  creditsRemaining: number;
  plan: DbUser["plan"];
  workspaceName?: string | null;
  inboxCount?: number;
  watchlistCount?: number;
  pipelineHotCount?: number;
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

export default function DashboardShell({
  children,
  creditsRemaining,
  plan,
  workspaceName,
  inboxCount,
  watchlistCount,
  pipelineHotCount,
}: DashboardShellProps) {
  const pathname = usePathname();
  const containerSize = pageContainerSize(pathname);

  return (
    <SearchProvider>
      <SidebarProvider
        className="bg-background"
        style={
          {
            "--sidebar-width": "16rem",
            "--header-height": "4rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          creditsRemaining={creditsRemaining}
          plan={plan}
          workspaceName={workspaceName}
          inboxCount={inboxCount}
          watchlistCount={watchlistCount}
          pipelineHotCount={pipelineHotCount}
        />
        <SidebarInset className="min-h-svh overflow-hidden">
          <SiteHeader creditsRemaining={creditsRemaining} />
          <PageContainer size={containerSize}>{children}</PageContainer>
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  );
}
