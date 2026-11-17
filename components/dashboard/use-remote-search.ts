"use client";

import { useEffect, useState } from "react";
import type { SearchResultItem } from "@/lib/dashboard-search";

export const SEARCH_DEBOUNCE_MS = 180;
export const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_ENDPOINT = "/api/dashboard/search";

export interface RemoteResults {
  companies: SearchResultItem[];
  watchlist: SearchResultItem[];
  lists: SearchResultItem[];
}

export type RemoteStatus = "idle" | "loading" | "ready" | "error";

interface RemoteState {
  query: string;
  results: RemoteResults;
  status: RemoteStatus;
}

export const EMPTY_REMOTE_RESULTS: RemoteResults = { companies: [], watchlist: [], lists: [] };

function asItems(value: unknown): SearchResultItem[] {
  return Array.isArray(value) ? (value as SearchResultItem[]) : [];
}

function parseResults(data: unknown): RemoteResults {
  const body = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    companies: asItems(body.companies),
    watchlist: asItems(body.watchlist),
    lists: asItems(body.lists),
  };
}

/** Debounced, abortable lookup against the dashboard search API. Failures surface as status "error". */
export function useRemoteSearch(query: string): { results: RemoteResults; status: RemoteStatus } {
  const [state, setState] = useState<RemoteState>({
    query: "",
    results: EMPTY_REMOTE_RESULTS,
    status: "idle",
  });

  useEffect(() => {
    if (query.length < SEARCH_MIN_QUERY_LENGTH) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState((prev) => ({ ...prev, query, status: "loading" }));
      fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Search failed with ${response.status}`);
          return response.json() as Promise<unknown>;
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setState({ query, results: parseResults(data), status: "ready" });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState({ query, results: EMPTY_REMOTE_RESULTS, status: "error" });
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  // Results belong to the query that produced them; a shorter query shows nothing remote.
  if (query.length < SEARCH_MIN_QUERY_LENGTH) return { results: EMPTY_REMOTE_RESULTS, status: "idle" };
  if (state.query !== query) {
    // Stale results stay visible while the next request is pending, so rows do not flash away.
    return { results: state.results, status: "loading" };
  }
  return { results: state.results, status: state.status };
}
