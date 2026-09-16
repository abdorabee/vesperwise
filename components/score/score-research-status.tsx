import { Skeleton } from "@/components/ui/skeleton";

export function ScoreResearchStatus({ mode = "score" }: { mode?: "score" | "chat" }) {
  return (
    <div className="score-research" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="score-research-dot size-1.5 rounded-full bg-primary" aria-hidden="true" />
        {mode === "score" ? "Verifying current signals and source dates…" : "Preparing a grounded response…"}
      </p>
      {mode === "score" ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-border/70" aria-hidden="true">
          <div className="grid grid-cols-[7rem_6rem_1fr] gap-3 border-b border-border/70 bg-muted/30 px-3 py-3"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-24" /></div>
          {[0, 1, 2, 3].map((row) => <div key={row} className="grid grid-cols-[7rem_6rem_1fr] gap-3 border-b border-border/60 px-3 py-4 last:border-0"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-full max-w-72" /></div>)}
        </div>
      ) : null}
    </div>
  );
}
