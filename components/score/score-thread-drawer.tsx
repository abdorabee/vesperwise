"use client";

import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScoreThreadList } from "@/components/score/score-thread-list";

export function ScoreThreadDrawer({
  open,
  onOpenChange,
  onSelect,
  onNewScore,
  activeId,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onNewScore: () => void;
  activeId: string | null;
  busy?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="duration-200 data-[state=open]:duration-200 data-[state=closed]:duration-200 sm:max-w-md">
        <SheetHeader className="border-b">
          {/* pr-8 keeps the action clear of the sheet's close button */}
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle>Score threads</SheetTitle>
              <SheetDescription>Restore a saved conversation without rescoring the account.</SheetDescription>
            </div>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                onNewScore();
                onOpenChange(false);
              }}
            >
              <Plus className="size-3" />
              New score
            </Button>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <ScoreThreadList
            activeId={activeId}
            busy={busy}
            enabled={open}
            onSelect={(id) => {
              onSelect(id);
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
