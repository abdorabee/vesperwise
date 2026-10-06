"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { History, Menu, PanelLeft, Plus } from "lucide-react";
import { CRUMB } from "@/components/dashboard/nav-config";
import { focusWatchlistAdd } from "@/lib/watchlist-events";
import { openScoreThreads, startNewScore } from "@/lib/score-workspace-events";
import { Button } from "@/components/ui/button";
import VesperWiseLogo from "@/components/vesperwise-logo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function SiteHeader() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const isLists = pathname === "/lists" || pathname.startsWith("/lists/");
  const isWatchlist = pathname === "/watchlist";
  const isScore = pathname === "/score";
  const listIdMatch = pathname.match(/^\/lists\/([^/]+)$/);
  const listId = listIdMatch?.[1] ?? null;
  const [fetchedListName, setFetchedListName] = useState<string | null>(null);

  useEffect(() => {
    if (!listId) return;
    let cancelled = false;
    fetch(`/api/dashboard/lists/${listId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setFetchedListName(d.list?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setFetchedListName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const title =
    (listId ? fetchedListName : null) ??
    CRUMB[pathname]?.current ??
    "VesperWise";
  const parent = listId ? "Lists" : CRUMB[pathname]?.parent ?? "Workspace";
  const parentHref =
    parent === "Settings" ? "/settings/profile" : parent === "Lists" ? "/lists" : "/dashboard";

  function openNewListModal() {
    window.dispatchEvent(new Event("lists-open-modal"));
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] duration-200 ease-linear motion-reduce:transition-none">
      <div className="flex min-w-0 w-full items-center gap-2">
        <SidebarTrigger className="-ml-1 size-11 shrink-0 md:hidden">
          {isMobile ? <Menu /> : <PanelLeft />}
        </SidebarTrigger>
        <Separator
          orientation="vertical"
          className="mr-2 hidden data-[orientation=vertical]:h-4"
        />
        <Breadcrumb className="hidden min-w-0 md:block">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink asChild>
                <Link href={parentHref} className="truncate">
                  {parent}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="max-w-[min(32rem,45vw)] truncate">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Link
          href="/dashboard"
          data-slot="mobile-brand"
          aria-label="VesperWise home"
          className="flex min-w-0 items-center gap-2 md:hidden"
        >
          <VesperWiseLogo size={26} className="rounded-md" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {isScore ? (
            <>
              <Button type="button" variant="ghost" size="sm" className="rounded-lg md:hidden" aria-label="Open score threads" onClick={() => openScoreThreads()}>
                <History className="size-4" />
                <span className="hidden sm:inline">Threads</span>
              </Button>
              <Button type="button" size="sm" className="rounded-lg" aria-label="Start a new score" onClick={() => startNewScore()}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">New score</span>
              </Button>
            </>
          ) : null}
          {isLists ? (
            // Desktop uses the list column's "+ New list"; the column is hidden on phones.
            <Button type="button" size="sm" className="rounded-lg md:hidden" onClick={openNewListModal}>
              <Plus className="size-4" />
              New list
            </Button>
          ) : null}
          {isWatchlist ? (
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={focusWatchlistAdd}
            >
              <Plus className="size-4" />
              Add to watchlist
            </Button>
          ) : null}
          {listId ? (
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" asChild>
              <Link href="/lists">Lists</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
