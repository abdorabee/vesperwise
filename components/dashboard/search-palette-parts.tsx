"use client";

import type { ComponentType } from "react";
import { Building2, Eye, Gauge, List } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import type { SearchNavItem, SearchResultItem } from "@/lib/dashboard-search";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export type PaletteRow =
  | { type: "page"; item: SearchNavItem }
  | { type: "result"; item: SearchResultItem };

export interface PaletteSection {
  title: string;
  rows: PaletteRow[];
}

const GROUP_CLASS =
  "p-0 pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground";

const ITEM_CLASS =
  "h-9 gap-2.5 rounded-md px-3 py-0 text-[13px] data-[selected=true]:bg-sidebar-accent data-[selected=true]:text-sidebar-accent-foreground";

const KIND_ICONS: Partial<Record<SearchResultItem["kind"], IconType>> = {
  company: Building2,
  watchlist: Eye,
  list: List,
  action: Gauge,
};

const BAND_CLASS: Record<NonNullable<SearchResultItem["band"]>, string> = {
  HOT: "text-[var(--hot)]",
  WARM: "text-[var(--warm)]",
  COLD: "text-[var(--cold)]",
};

function PaletteRowItem({ row, onSelect }: { row: PaletteRow; onSelect: (row: PaletteRow) => void }) {
  const Icon = row.type === "page" ? row.item.icon : KIND_ICONS[row.item.kind];
  const result = row.type === "result" ? row.item : null;
  const secondary = result?.sublabel;
  const meta = result?.meta;

  return (
    <CommandItem value={`${row.type}:${row.item.id}`} onSelect={() => onSelect(row)} className={ITEM_CLASS}>
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{row.item.label}</span>
      {secondary && <span className="max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">{secondary}</span>}
      {meta && (
        <span className={cn("shrink-0 font-mono text-xs text-muted-foreground", result?.band && BAND_CLASS[result.band])}>
          {meta}
        </span>
      )}
    </CommandItem>
  );
}

export function PaletteSections({
  sections,
  onSelect,
}: {
  sections: PaletteSection[];
  onSelect: (row: PaletteRow) => void;
}) {
  return (
    <>
      {sections.map((section) => (
        <CommandGroup key={section.title} heading={section.title} className={GROUP_CLASS}>
          {section.rows.map((row) => (
            <PaletteRowItem key={`${row.type}:${row.item.id}`} row={row} onSelect={onSelect} />
          ))}
        </CommandGroup>
      ))}
    </>
  );
}

const KBD_CLASS =
  "mr-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-muted/40 px-1 font-mono text-[10px] text-muted-foreground";

export function PaletteFooter({ status }: { status: string }) {
  return (
    <div className="flex h-9 items-center gap-4 border-t border-border px-4 text-[11px] text-muted-foreground">
      <span><kbd className={KBD_CLASS}>↑↓</kbd>navigate</span>
      <span><kbd className={KBD_CLASS}>↵</kbd>open</span>
      <span><kbd className={KBD_CLASS}>esc</kbd>close</span>
      <span role="status" aria-live="polite" className="ml-auto">{status}</span>
    </div>
  );
}
