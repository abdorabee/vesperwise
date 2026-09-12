"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import { CRUMB } from "@/components/dashboard/nav-config";
import { focusWatchlistAdd } from "@/lib/watchlist-events";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  const pathname = usePathname();
  const isLists = pathname === "/lists" || pathname.startsWith("/lists/");
  const isBilling = pathname === "/billing";
  const isWatchlist = pathname === "/watchlist";
  const listIdMatch = pathname.match(/^\/lists\/([^/]+)$/);
  const listId = listIdMatch?.[1] ?? null;
  const [fetchedListName, setFetchedListName] = useState<string | null>(null);
  const { open: openSearch } = useDashboardSearch();

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

  const listName = listId ? fetchedListName : null;

  const crumb = CRUMB[pathname] ?? (
    listId
      ? { parent: "Lists", current: listName ?? "List detail" }
      : { parent: "Workspace", current: "VesperWise" }
  );

  function openNewListModal() {
    window.dispatchEvent(new Event("lists-open-modal"));
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              {listId ? (
                <BreadcrumbLink asChild>
                  <Link href="/lists">{crumb.parent}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-muted-foreground">{crumb.parent}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{listId ? (listName ?? "…") : crumb.current}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={openSearch}
          >
            <Search className="size-4" />
            Search
            <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center rounded border bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground tabular-nums sm:inline-flex">
              ⌘K
            </kbd>
          </Button>
          {isLists ? (
            <Button type="button" size="sm" onClick={openNewListModal}>
              <Plus className="size-4" />
              New list
            </Button>
          ) : null}
          {isBilling ? (
            <Button type="button" variant="outline" size="sm">
              Export
            </Button>
          ) : null}
          {isWatchlist ? (
            <Button type="button" size="sm" onClick={focusWatchlistAdd}>
              <Plus className="size-4" />
              Add to watchlist
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
