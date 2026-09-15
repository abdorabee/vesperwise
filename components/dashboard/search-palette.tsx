"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Gauge, Search } from "lucide-react";
import {
  filterNavItems,
  type SearchNavItem,
  type SearchResultItem,
} from "@/lib/dashboard-search";

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RemoteResults {
  companies: SearchResultItem[];
  people: SearchResultItem[];
  watchlist: SearchResultItem[];
  lists: SearchResultItem[];
}

const EMPTY: RemoteResults = {
  companies: [],
  people: [],
  watchlist: [],
  lists: [],
};

type PaletteRow =
  | { type: "page"; item: SearchNavItem }
  | { type: "result"; item: SearchResultItem };

interface PaletteSection {
  title: string;
  rows: PaletteRow[];
}

function bandClass(band?: SearchResultItem["band"]) {
  if (band === "HOT") return "band-hot";
  if (band === "WARM") return "band-warm";
  if (band === "COLD") return "band-cold";
  return "";
}

const itemClass =
  "cmd-item flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-[var(--text-primary)]";
const itemActiveClass = "active";

export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState<RemoteResults>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmedQuery = query.trim();
  const pages = useMemo(() => filterNavItems(query), [query]);

  const scoreAction = useMemo((): SearchResultItem | null => {
    if (trimmedQuery.length < 2) return null;
    return {
      id: "action-score",
      kind: "action",
      label: `Score ${trimmedQuery}`,
      sublabel: "Run a new intent score",
      href: `/score?domain=${encodeURIComponent(trimmedQuery)}`,
    };
  }, [trimmedQuery]);

  const sections = useMemo((): PaletteSection[] => {
    const out: PaletteSection[] = [];

    if (pages.length) {
      out.push({
        title: "Pages",
        rows: pages.map((item) => ({ type: "page", item })),
      });
    }

    if (trimmedQuery.length >= 2) {
      if (remote.companies.length) {
        out.push({
          title: "Companies",
          rows: remote.companies.map((item) => ({ type: "result", item })),
        });
      }
      if (remote.watchlist.length) {
        out.push({
          title: "Watchlist",
          rows: remote.watchlist.map((item) => ({ type: "result", item })),
        });
      }
      if (remote.people.length) {
        out.push({
          title: "People",
          rows: remote.people.map((item) => ({ type: "result", item })),
        });
      }
      if (remote.lists.length) {
        out.push({
          title: "Lists",
          rows: remote.lists.map((item) => ({ type: "result", item })),
        });
      }
      if (scoreAction) {
        out.push({
          title: "Actions",
          rows: [{ type: "result", item: scoreAction }],
        });
      }
    }

    return out;
  }, [pages, remote, trimmedQuery, scoreAction]);

  const flatRows = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/dashboard/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data: RemoteResults) => {
          if (!controller.signal.aborted) setRemote(data);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemote(EMPTY);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmedQuery, open]);

  const selectRow = useCallback(
    (row: PaletteRow) => {
      setQuery("");
      setRemote(EMPTY);
      setActiveIndex(0);
      onOpenChange(false);
      router.push(row.type === "page" ? row.item.href : row.item.href);
    },
    [onOpenChange, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatRows[activeIndex]) {
      e.preventDefault();
      selectRow(flatRows[activeIndex]);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const showEmpty =
    !loading &&
    flatRows.length === 0 &&
    (trimmedQuery.length >= 2 || pages.length === 0);

  let rowIndex = -1;

  const palette = (
    <div
      className="cmd-backdrop"
      onClick={() => {
        setQuery("");
        setRemote(EMPTY);
        setActiveIndex(0);
        onOpenChange(false);
      }}
      role="presentation"
    >
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div className="cmd-input-row flex items-center gap-2.5 px-4 py-3.5">
          <Search className="ic h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input min-w-0 flex-1 border-none bg-transparent text-[15px] text-[var(--text-primary)] outline-none"
            placeholder="Search companies, people, pages…"
            value={query}
            onChange={(e) => {
              const nextQuery = e.target.value;
              setQuery(nextQuery);
              setActiveIndex(0);
              if (nextQuery.trim().length < 2) {
                setRemote(EMPTY);
                setLoading(false);
              }
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="kbd">esc</kbd>
        </div>

        <div className="cmd-results" role="listbox">
          {showEmpty && (
            <div className="cmd-empty">
              {trimmedQuery.length >= 2
                ? "No results — try a domain or page name"
                : "Type to search or pick a page"}
            </div>
          )}

          {sections.map((section) => (
            <div key={section.title} className="cmd-group flex flex-col gap-0.5">
              <div className="cmd-group-label">{section.title}</div>
              {section.rows.map((row) => {
                rowIndex += 1;
                const idx = rowIndex;
                const active = idx === activeIndex;
                const Icon =
                  row.type === "page"
                    ? row.item.icon
                    : row.item.kind === "action"
                      ? Gauge
                      : null;

                const label = row.type === "page" ? row.item.label : row.item.label;
                const sublabel = row.type === "page" ? undefined : row.item.sublabel;
                const meta = row.type === "page" ? undefined : row.item.meta;
                const band = row.type === "page" ? undefined : row.item.band;
                const key = row.type === "page" ? row.item.id : row.item.id;

                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${itemClass}${active ? ` ${itemActiveClass}` : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectRow(row)}
                  >
                    {Icon && (
                      <Icon
                        className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]"
                        aria-hidden
                      />
                    )}
                    <span className="cmd-item-label min-w-0 flex-1 truncate">{label}</span>
                    {sublabel && (
                      <span className="cmd-item-sub max-w-[45%] truncate text-xs text-[var(--text-tertiary)]">
                        {sublabel}
                      </span>
                    )}
                    {meta && (
                      <span className={`cmd-item-meta shrink-0 font-mono text-xs ${bandClass(band)}`}>
                        {meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {loading && trimmedQuery.length >= 2 && (
            <div className="cmd-empty">Searching…</div>
          )}
        </div>

        <div className="cmd-foot">
          <span>
            <kbd className="kbd">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="kbd">↵</kbd> open
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(palette, document.body);
}
