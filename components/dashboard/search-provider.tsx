"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SearchPalette } from "@/components/dashboard/search-palette";
import { SEARCH_OPEN_EVENT } from "@/lib/dashboard-search";

interface SearchContextValue {
  open: () => void;
  close: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useDashboardSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useDashboardSearch must be used within SearchProvider");
  }
  return ctx;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(SEARCH_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(SEARCH_OPEN_EVENT, onOpenEvent);
    };
  }, []);

  const value = useMemo(
    () => ({ open: openPalette, close: closePalette }),
    [openPalette, closePalette],
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchPalette open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}
