"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Command, CommandInput, CommandList } from "@/components/ui/command";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import {
  PaletteFooter,
  PaletteSections,
  type PaletteRow,
  type PaletteSection,
} from "@/components/dashboard/search-palette-parts";
import { SEARCH_MIN_QUERY_LENGTH, useRemoteSearch } from "@/components/dashboard/use-remote-search";
import { filterNavItems, type SearchResultItem } from "@/lib/dashboard-search";
import { followScoreChatLink, followScoreLink } from "@/lib/score-chat";
import { cn } from "@/lib/utils";

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OVERLAY_CLASS =
  "bg-[color-mix(in_srgb,var(--background)_60%,transparent)] backdrop-blur-sm duration-150 motion-reduce:animate-none";

const CONTENT_CLASS = cn(
  "fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden",
  "rounded-xl! border border-border bg-popover text-popover-foreground shadow-[var(--shadow-lg)] outline-none",
  "duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]",
  "motion-reduce:animate-none motion-reduce:data-[state=closed]:animate-none",
);

const COMMAND_CLASS =
  "h-auto rounded-xl bg-transparent **:data-[slot=command-input-wrapper]:h-12 **:data-[slot=command-input-wrapper]:px-4";

const MESSAGE_CLASS = "px-3 py-6 text-center text-[13px] text-muted-foreground";

function navigate(href: string, push: (href: string) => void) {
  let handled = false;
  const event = {
    preventDefault() {
      handled = true;
    },
  };
  if (href === "/score#chat") followScoreChatLink(event);
  else if (href === "/score") followScoreLink(event);
  if (!handled) push(href);
}

function buildScoreAction(query: string): SearchResultItem | null {
  if (query.length < SEARCH_MIN_QUERY_LENGTH) return null;
  return {
    id: "action-score",
    kind: "action",
    label: `Score ${query}`,
    sublabel: "Run a new intent score",
    href: `/score?domain=${encodeURIComponent(query)}`,
  };
}

function SearchPaletteBody({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const { results, status } = useRemoteSearch(trimmed);

  const pages = useMemo(() => filterNavItems(query), [query]);
  const scoreAction = useMemo(() => buildScoreAction(trimmed), [trimmed]);

  const sections = useMemo((): PaletteSection[] => {
    const next: PaletteSection[] = [];
    if (pages.length) next.push({ title: "Pages", rows: pages.map((item) => ({ type: "page", item })) });
    const remote: Array<[string, SearchResultItem[]]> = [
      ["Companies", results.companies],
      ["Watchlist", results.watchlist],
      ["Lists", results.lists],
    ];
    for (const [title, items] of remote) {
      if (items.length) next.push({ title, rows: items.map((item) => ({ type: "result", item })) });
    }
    if (scoreAction) next.push({ title: "Actions", rows: [{ type: "result", item: scoreAction }] });
    return next;
  }, [pages, results, scoreAction]);

  const handleSelect = useCallback(
    (row: PaletteRow) => {
      onOpenChange(false);
      navigate(row.item.href, router.push);
    },
    [onOpenChange, router.push],
  );

  const hasMatches = pages.length > 0 || results.companies.length + results.watchlist.length + results.lists.length > 0;
  const isSearching = scoreAction !== null;
  const showEmpty = isSearching && status !== "loading" && status !== "error" && !hasMatches;
  const footerStatus = status === "loading" ? "Searching…" : "";

  return (
    <Command shouldFilter={false} loop label="Search" className={COMMAND_CLASS}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search companies, lists, pages…"
        autoComplete="off"
        spellCheck={false}
        className="h-12 text-[15px]"
      />
      <CommandList className="max-h-[min(360px,50vh)] p-1.5">
        {status === "error" && (
          <div role="status" className="px-3 py-2 text-xs text-muted-foreground">
            Couldn&apos;t load company results. Pages and actions still work.
          </div>
        )}
        {showEmpty && <div className={MESSAGE_CLASS}>No results for “{trimmed}”</div>}
        <PaletteSections sections={sections} onSelect={handleSelect} />
      </CommandList>
      <PaletteFooter status={footerStatus} />
    </Command>
  );
}

export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  // The palette has no Dialog.Trigger, so Radix has nothing to hand focus back to; remember the opener ourselves.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={OVERLAY_CLASS} />
        <DialogPrimitive.Content
          data-slot="search-palette"
          className={CONTENT_CLASS}
          onOpenAutoFocus={() => {
            returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
            returnFocusRef.current = null;
          }}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, companies, watchlist entries and lists, or score a new domain.
          </DialogDescription>
          <SearchPaletteBody onOpenChange={onOpenChange} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
