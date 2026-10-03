"use client";

import { PanelRightOpen } from "lucide-react";
import { BandPill, CompanyMark } from "@/components/score/band";
import type { ScoreReport } from "@/components/score/score-report-model";

export function ScoreResultCard({
  report,
  onView,
}: {
  report: Extract<ScoreReport, { kind: "ui" }>;
  onView: (id: string) => void;
}) {
  const title = report.company ?? report.domain ?? report.label;

  return (
    <article className="score-result-card rounded-lg border border-border/70 bg-card/45 p-3">
      <div className="flex items-start gap-3">
        {report.domain ? <CompanyMark domain={report.domain} name={report.company} size={32} className="mt-0.5" /> : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          {report.domain ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{report.domain}</p> : null}
          {report.score != null && report.band ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-foreground">{Math.round(report.score)}/100</span>
              <BandPill band={report.band} size="sm" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{report.label}</p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          onClick={() => onView(report.id)}
        >
          <PanelRightOpen className="size-3.5" aria-hidden="true" />
          View report
        </button>
      </div>
    </article>
  );
}
