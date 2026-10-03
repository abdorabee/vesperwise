"use client";

import type { ReactNode } from "react";
import { ShellList } from "@/components/dashboard/shell/shell-list";
import { CompanyMark } from "@/components/score/band";
import type { ScoreBand } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface AccountListItem {
  domain: string;
  name: string;
  score: number | null;
  band: ScoreBand | null;
}

export interface AccountListGroup {
  label?: string;
  items: AccountListItem[];
}

const BAND_DOT: Record<ScoreBand, string> = {
  HOT: "var(--hot)",
  WARM: "var(--warm)",
  COLD: "var(--cold)",
};

/** Highest score first; unscored accounts last, then by name. */
export function sortAccountsByScore(items: AccountListItem[]): AccountListItem[] {
  return [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name));
}

function AccountRow({ item, selected, onSelect }: { item: AccountListItem; selected: boolean; onSelect: (domain: string) => void }) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      onClick={() => onSelect(item.domain)}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        selected ? "bg-muted text-foreground" : "text-muted-foreground",
      )}
    >
      <CompanyMark domain={item.domain} name={item.name} size={18} className="rounded" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
        <span className="block truncate text-xs">{item.domain}</span>
      </span>
      <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
        {item.band ? <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: BAND_DOT[item.band] }} /> : null}
        {item.score ?? "—"}
        {item.band ? <span className="sr-only">{item.band}</span> : null}
      </span>
    </button>
  );
}

/** Content of an account list column; exported separately so it can be server-rendered in tests. */
export function AccountListContent({ groups, selectedDomain, onSelect, emptyText }: { groups: AccountListGroup[]; selectedDomain: string | null; onSelect: (domain: string) => void; emptyText: string }) {
  const visible = groups.filter((group) => group.items.length > 0);
  if (visible.length === 0) return <p className="p-3 text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-1 p-2">
      {visible.map((group, index) => (
        <div key={group.label ?? index} className="space-y-0.5">
          {group.label ? <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground first:pt-1">{group.label}</p> : null}
          {group.items.map((item) => (
            <AccountRow key={item.domain} item={item} selected={item.domain.toLowerCase() === selectedDomain} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A shell list column of accounts; clicking one opens it in the shared account panel. */
export function AccountListColumn({ label, title, actions, groups, selectedDomain, onSelect, emptyText }: {
  label: string;
  title: string;
  actions?: ReactNode;
  groups: AccountListGroup[];
  selectedDomain: string | null;
  onSelect: (domain: string) => void;
  emptyText: string;
}) {
  return (
    <ShellList label={label} title={title} actions={actions}>
      <AccountListContent groups={groups} selectedDomain={selectedDomain} onSelect={onSelect} emptyText={emptyText} />
    </ShellList>
  );
}
