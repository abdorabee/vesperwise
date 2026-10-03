"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { ShellList } from "@/components/dashboard/shell/shell-list";
import { Button } from "@/components/ui/button";
import type { ListCardSummary } from "@/lib/lists-types";
import { cn } from "@/lib/utils";

interface ListsColumnContentProps {
  activeId?: string | null;
  summaries: ListCardSummary[];
}

function rowCountLabel(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`;
}

export function ListsColumnContent({ activeId, summaries }: ListsColumnContentProps) {
  if (summaries.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">No lists yet.</p>;
  }

  return (
    <nav aria-label="Lists" className="space-y-1 p-2">
      {summaries.map((summary) => {
        const active = summary.id === activeId;
        return (
          <Link
            key={summary.id}
            href={`/lists/${summary.id}`}
            aria-current={active ? "page" : undefined}
            data-active={active ? "true" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              active ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: summary.color || "var(--iq-accent)" }}
            />
            <span className="min-w-0 flex-1 truncate font-medium">{summary.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {rowCountLabel(summary.accountCount)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ListsShellList({
  activeId,
  newListHref,
  summaries,
  onNewList,
}: ListsColumnContentProps & {
  newListHref?: string;
  onNewList?: () => void;
}) {
  const action = newListHref ? (
    <Button type="button" size="xs" variant="ghost" asChild>
      <Link href={newListHref}>
        <Plus className="size-3" />
        New list
      </Link>
    </Button>
  ) : (
    <Button type="button" size="xs" variant="ghost" onClick={onNewList}>
      <Plus className="size-3" />
      New list
    </Button>
  );

  return (
    <ShellList label="Lists" title="Lists" actions={action}>
      <ListsColumnContent activeId={activeId} summaries={summaries} />
    </ShellList>
  );
}
