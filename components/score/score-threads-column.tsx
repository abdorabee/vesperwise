"use client";

import { Plus } from "lucide-react";

import { ShellList } from "@/components/dashboard/shell/shell-list";
import { Button } from "@/components/ui/button";
import { ScoreThreadList } from "@/components/score/score-thread-list";

interface ScoreThreadsColumnProps {
  activeId: string | null;
  busy: boolean;
  onNewScore: () => void;
  onSelect: (id: string) => void;
}

export function ScoreThreadsColumn({
  activeId,
  busy,
  onNewScore,
  onSelect,
}: ScoreThreadsColumnProps) {
  return (
    <ShellList
      label="Score threads"
      title="Threads"
      actions={
        <Button type="button" size="xs" variant="ghost" onClick={onNewScore}>
          <Plus className="size-3" />
          New score
        </Button>
      }
    >
      <ScoreThreadList activeId={activeId} busy={busy} onSelect={onSelect} />
    </ShellList>
  );
}
