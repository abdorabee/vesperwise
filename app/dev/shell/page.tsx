"use client";

import { useEffect } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Public no-auth mock of Pass 1 Blocks chrome.
 * Forces light theme so review can match ui.shadcn.com/blocks dashboard-01.
 */
export default function DevShellPage() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    try {
      localStorage.setItem("intentiq-theme", "light");
    } catch {
      /* ignore */
    }
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

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
          creditsRemaining={42}
          plan="growth"
          workspaceName="Preview Workspace"
          inboxCount={3}
          watchlistCount={8}
          pipelineHotCount={2}
        />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                  <div className="aspect-video rounded-xl bg-muted/50" />
                  <div className="aspect-video rounded-xl bg-muted/50" />
                  <div className="aspect-video rounded-xl bg-muted/50" />
                  <div className="aspect-video rounded-xl bg-muted/50" />
                </div>
                <div className="px-4 lg:px-6">
                  <div className="min-h-[40vh] rounded-xl bg-muted/50" />
                </div>
                <p className="px-4 text-sm text-muted-foreground lg:px-6">
                  Pass 1 chrome aligned to{" "}
                  <span className="font-medium text-foreground">dashboard-01</span>
                  : Quick Score, Library group, SiteHeader title. Score bodies untouched.
                </p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  );
}
