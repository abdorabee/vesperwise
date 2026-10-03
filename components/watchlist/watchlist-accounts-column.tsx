"use client";

import { Plus } from "lucide-react";
import { AccountListColumn, sortAccountsByScore, type AccountListGroup } from "@/components/account-panel/account-list-column";
import { Button } from "@/components/ui/button";
import type { WatchlistEntry } from "@/lib/types";

/** Watchlist accounts, highest score first. Exported for tests. */
export function watchlistAccountGroups(entries: Pick<WatchlistEntry, "domain" | "company_name" | "score" | "score_band">[]): AccountListGroup[] {
  return [{
    items: sortAccountsByScore(entries.map((entry) => ({
      domain: entry.domain,
      name: entry.company_name,
      score: entry.score ?? null,
      band: entry.score_band ?? null,
    }))),
  }];
}

export function WatchlistAccountsColumn({ entries, selectedDomain, onSelect, onFocusAdd }: {
  entries: Pick<WatchlistEntry, "domain" | "company_name" | "score" | "score_band">[];
  selectedDomain: string | null;
  onSelect: (domain: string) => void;
  onFocusAdd: () => void;
}) {
  return (
    <AccountListColumn
      label="Watchlist accounts"
      title="Watchlist"
      actions={
        <Button type="button" size="xs" variant="ghost" onClick={onFocusAdd}>
          <Plus className="size-3" aria-hidden="true" />
          Add
        </Button>
      }
      groups={watchlistAccountGroups(entries)}
      selectedDomain={selectedDomain}
      onSelect={onSelect}
      emptyText="No accounts on your watchlist yet."
    />
  );
}
