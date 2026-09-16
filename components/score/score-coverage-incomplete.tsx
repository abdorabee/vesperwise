"use client";

import { AlertTriangle, CheckCircle2, Clock3, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CoverageSignalView, IncompleteCoverageResult } from "@/lib/score-coverage";
import { cn } from "@/lib/utils";

function SignalStatusIcon({ signal }: { signal: CoverageSignalView }) {
  if (signal.state === "verified" || signal.state === "checked") {
    return <CheckCircle2 className="size-4 text-muted-foreground" aria-hidden="true" />;
  }
  if (signal.state === "stale") {
    return <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />;
  }
  return <span className="size-2 rounded-full bg-muted-foreground/45" aria-hidden="true" />;
}

export function ScoreCoverageIncomplete({
  result,
  onRetry,
  onReset,
}: {
  result: IncompleteCoverageResult;
  onRetry: (domain: string) => void;
  onReset: () => void;
}) {
  return (
    <section
      data-slot="score-coverage-incomplete"
      className="score-artifact overflow-hidden rounded-xl border border-border/80 bg-card/30"
      aria-labelledby={`coverage-title-${result.domain}`}
    >
      <header className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={`coverage-title-${result.domain}`} className="text-base font-semibold tracking-[-0.02em] text-foreground">
              We couldn’t calculate a reliable score
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {result.domain} did not return enough current, source-backed evidence. Missing coverage is not treated as a zero score.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 bg-background/60 tabular-nums">
          {result.coveragePercent}% coverage
        </Badge>
      </header>

      <div className="divide-y divide-border/60">
        {result.signals.map((signal) => (
          <div key={signal.key} className="score-artifact-row grid gap-2 px-5 py-3.5 sm:grid-cols-[9rem_7rem_1fr] sm:items-start sm:gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <SignalStatusIcon signal={signal} />
              {signal.label}
            </div>
            <div className={cn("text-sm font-medium tabular-nums", signal.state === "unavailable" || signal.state === "not_found" ? "text-muted-foreground" : "text-foreground")}>
              {signal.currentRead}
            </div>
            <div>
              <p className="text-sm leading-5 text-foreground/80">{signal.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {signal.statusLabel}{signal.source ? ` · ${signal.source}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <footer className="score-artifact-actions flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          No score was produced · No credit charged
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onRetry(result.domain)}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Retry sources
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onReset}>
            Score another company
          </Button>
        </div>
      </footer>
    </section>
  );
}
