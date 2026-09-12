"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Public no-auth mock of the Pass 1 Blocks dashboard chrome.
 * Safe for preview review without Clerk (preview / non-production only).
 */
export default function DevShellPage() {
  return (
    <SearchProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "3.5rem",
            "--header-height": "3rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          creditsRemaining={42}
          plan="growth"
          workspaceName="Preview Workspace"
          inboxCount={3}
          watchlistCount={8}
          pipelineHotCount={2}
        />
        <SidebarInset className="overflow-hidden">
          <SiteHeader />
          <div className="page">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="page-title">Blocks shell preview</h1>
                <p className="page-sub">
                  Pass 1 chrome only — SidebarProvider, AppSidebar, SiteHeader, breadcrumbs.
                  Score/auth bodies are unchanged.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
              </div>
              <div className="min-h-[40vh] flex-1 rounded-xl bg-muted/50" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  );
}
