"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { listChatSessions, type ChatSessionSummary } from "@/lib/chat-client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export function ScoreThreadDrawer({ open, onOpenChange, onSelect, activeId }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (id: string) => void; activeId: string | null }) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError("");
      try {
        const next = await listChatSessions();
        if (!cancelled) setSessions(next);
      } catch (reason) {
        if (!cancelled) setError((reason as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="duration-200 data-[state=open]:duration-200 data-[state=closed]:duration-200 sm:max-w-md">
        <SheetHeader className="border-b"><SheetTitle>Score threads</SheetTitle><SheetDescription>Restore a saved conversation without rescoring the account.</SheetDescription></SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {loading ? <div className="space-y-3 p-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div> : null}
          {error ? <p className="p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          {!loading && !error && sessions.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No saved score threads yet.</p> : null}
          {sessions.map((session) => <button key={session.id} type="button" className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none" aria-current={session.id === activeId ? "page" : undefined} onClick={() => { onSelect(session.id); onOpenChange(false); }}><Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-foreground">{session.title}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(session.updated_at).toLocaleDateString()}</span></span></button>)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
