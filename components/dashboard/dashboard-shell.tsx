"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import DashboardNav from "@/components/dashboard/nav";
import DashboardTopbar from "@/components/dashboard/dashboard-topbar";
import { SearchProvider } from "@/components/dashboard/search-provider";
import type { DbUser } from "@/lib/types";

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
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapsed preference from localStorage after mount.
  useEffect(() => {
    if (localStorage.getItem("nav-collapsed") === "true") setCollapsed(true);
  }, []);

  // Track viewport — sidebar becomes off-canvas drawer on phones/tablets.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const apply = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Close the mobile drawer on route change.
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem("nav-collapsed", String(!prev));
      return !prev;
    });
  }

  // On mobile the drawer always shows the full nav (ignore the desktop collapse state).
  const effectiveCollapsed = isMobile ? false : collapsed;

  return (
    <SearchProvider>
      <div
        className={`app${mobileOpen ? " nav-open" : ""}`}
        style={{ gridTemplateColumns: collapsed ? "56px 1fr" : "232px 1fr" }}
      >
        <DashboardNav
          creditsRemaining={creditsRemaining}
          plan={plan}
          workspaceName={workspaceName}
          collapsed={effectiveCollapsed}
          onToggle={toggle}
          inboxCount={inboxCount}
          watchlistCount={watchlistCount}
          pipelineHotCount={pipelineHotCount}
        />
        <div
          className="nav-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <div className="main">
          <DashboardTopbar onMenuClick={() => setMobileOpen(true)} />
          <main className={pageClass}>{children}</main>
        </div>
      </div>
    </SearchProvider>
  );
}
