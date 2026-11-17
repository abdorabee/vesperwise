"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import type { SearchResultItem } from "@/lib/dashboard-search";

export interface PickedAccount {
  domain: string;
  company_name: string;
}

interface AccountPickerProps {
  selected: PickedAccount[];
  onChange: (next: PickedAccount[]) => void;
  max: number;
}

interface SearchResponse {
  companies?: SearchResultItem[];
  watchlist?: SearchResultItem[];
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

function toAccounts(data: SearchResponse): PickedAccount[] {
  const byDomain = new Map<string, PickedAccount>();
  for (const item of [...(data.companies ?? []), ...(data.watchlist ?? [])]) {
    const domain = (item.sublabel ?? "").trim().toLowerCase();
    if (domain && !byDomain.has(domain)) byDomain.set(domain, { domain, company_name: item.label });
  }
  return [...byDomain.values()];
}

export function AccountPicker({ selected, onChange, max }: AccountPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const searching = query.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!searching) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error("Search failed");
        const accounts = toAccounts((await res.json()) as SearchResponse);
        if (ticket !== latest.current) return;
        setResults(accounts);
        setError(null);
      } catch {
        if (ticket === latest.current) setError("Could not search your accounts. Try again.");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searching]);

  const chosen = new Set(selected.map((s) => s.domain));
  const atCap = selected.length >= max;
  const visible = searching ? results.filter((r) => !chosen.has(r.domain)) : [];

  function pick(account: PickedAccount) {
    onChange([...selected, account]);
    setQuery("");
    setResults([]);
  }

  return (
    <div>
      <input
        className="lst-field-input"
        type="search"
        placeholder="Search your scored or watchlisted accounts…"
        aria-label="Search accounts to add"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={atCap}
      />
      {atCap && <p className="mt-1 text-xs text-muted-foreground">Limit of {max} accounts reached.</p>}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      {visible.length > 0 && !atCap && (
        <ul aria-label="Matching accounts" className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border">
          {visible.map((account) => (
            <li key={account.domain}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => pick(account)}
              >
                <span className="truncate">{account.company_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{account.domain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <ul aria-label="Selected accounts" className="mt-3 flex flex-wrap gap-2">
          {selected.map((account) => (
            <li
              key={account.domain}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
            >
              <span>{account.company_name}</span>
              <button
                type="button"
                aria-label={`Remove ${account.company_name}`}
                className="grid size-4 place-items-center rounded-full hover:bg-foreground/10"
                onClick={() => onChange(selected.filter((s) => s.domain !== account.domain))}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {selected.length} of {max} selected. You can also add accounts later.
      </p>
    </div>
  );
}
