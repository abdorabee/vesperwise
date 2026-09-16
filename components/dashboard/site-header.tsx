"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { History, Plus } from "lucide-react";
import { CRUMB } from "@/components/dashboard/nav-config";
import { focusWatchlistAdd } from "@/lib/watchlist-events";
import { openScoreThreads, startNewScore } from "@/lib/score-workspace-events";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader({ creditsRemaining }: { creditsRemaining?: number }) {
  const pathname = usePathname();
  const isLists = pathname === "/lists" || pathname.startsWith("/lists/");
  const isBilling = pathname === "/billing";
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
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] duration-200 ease-linear motion-reduce:transition-none">
      <div className="flex min-w-0 w-full items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 hidden data-[orientation=vertical]:h-4 md:block"
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
          className="flex min-w-0 items-center gap-2 md:hidden"
        >
          <span
            aria-hidden="true"
            className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground"
          >
            V
          </span>
          <span className="truncate font-semibold">VesperWise</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {isScore ? (
            <>
              <Button type="button" variant="ghost" size="sm" className="rounded-lg" aria-label="Open score threads" onClick={() => openScoreThreads()}>
                <History className="size-4" />
                <span className="hidden sm:inline">Threads</span>
              </Button>
              <span className="hidden text-xs text-muted-foreground md:inline">
                <strong className="font-semibold tabular-nums text-foreground">{creditsRemaining ?? 0}</strong> credits left
              </span>
              <Button type="button" size="sm" className="rounded-lg" aria-label="Start a new score" onClick={() => startNewScore()}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">New score</span>
              </Button>
            </>
          ) : null}
          {isLists ? (
            <Button type="button" size="sm" className="rounded-lg" onClick={openNewListModal}>
              <Plus className="size-4" />
              New list
            </Button>
          ) : null}
          {isBilling ? (
            <Button type="button" variant="outline" size="sm" className="rounded-lg">
              Export
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
