"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
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
  const flushPages = ["/billing", "/inbox", "/score"];
  const pageClass = flushPages.includes(pathname) ? "page page-flush" : "page";

  return (
    <SearchProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
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
        <SidebarInset className="overflow-hidden">
          <SiteHeader />
          <div className={pageClass}>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  );
}
