"use client";

import { useRef } from "react";
import { BandPill, CompanyMark } from "@/components/score/band";
import { ThinkingOrb } from "@/components/score/thinking-orb";
import { getNextCompanyTabIndex, type ScoreReport } from "@/components/score/score-report-model";
import { cn } from "@/lib/utils";

const TAB_KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];

function reportTitle(report: ScoreReport) {
  if (report.kind === "pending") return report.domain;
  return report.company ?? report.domain ?? report.label;
}

export function ScoreCompanyTabs({
  reports,
  selectedId,
  onSelect,
}: {
  reports: ScoreReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  if (reports.length === 0) return null;

  const selectedIndex = Math.max(0, reports.findIndex((report) => report.id === selectedId));

  return (
    <div
      role="tablist"
      aria-label="Score reports"
      className="score-company-tabs flex gap-2 overflow-x-auto border-b border-border/70 pb-3"
      onKeyDown={(event) => {
        if (!TAB_KEYS.includes(event.key)) return;
        event.preventDefault();
        const nextIndex = getNextCompanyTabIndex(selectedIndex, reports.length, event.key);
        const next = reports[nextIndex];
        if (!next) return;
        onSelect(next.id);
        refs.current[nextIndex]?.focus();
      }}
    >
      {reports.map((report, index) => {
        const selected = report.id === selectedId;
        const title = reportTitle(report);
        return (
          <button
            key={report.id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "group flex min-h-11 max-w-[14rem] shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left outline-none transition-[background-color,border-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              selected ? "border-foreground/20 bg-muted/45 text-foreground" : "border-border/70 bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
            onClick={() => onSelect(report.id)}
          >
            {report.kind === "pending" ? (
              <ThinkingOrb label={`Scoring ${report.domain}`} size={12} />
            ) : report.domain ? (
              <CompanyMark domain={report.domain} name={report.company} size={18} />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{title}</span>
              {report.kind === "ui" && report.domain && report.domain !== title ? (
                <span className="block truncate text-xs text-muted-foreground">{report.domain}</span>
              ) : report.kind === "pending" ? (
                <span className="block text-xs text-muted-foreground">Scoring…</span>
              ) : null}
            </span>
            {report.kind === "ui" && report.score != null && report.band ? (
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-xs font-semibold tabular-nums">{Math.round(report.score)}</span>
                <BandPill band={report.band} size="sm" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
