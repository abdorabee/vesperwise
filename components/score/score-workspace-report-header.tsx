"use client";

import { PanelRightOpen } from "lucide-react";
import { ScoreCompanyTabs } from "@/components/score/score-company-tabs";
import type { ScoreReport } from "@/components/score/score-report-model";
import { Button } from "@/components/ui/button";

export function ScoreWorkspaceReportHeader({
  reports,
  selectedReport,
  onSelect,
  onOpen,
}: {
  reports: ScoreReport[];
  selectedReport: ScoreReport | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1">
        <ScoreCompanyTabs reports={reports} selectedId={selectedReport?.id ?? null} onSelect={onSelect} />
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-lg" disabled={!selectedReport} onClick={onOpen}>
        <PanelRightOpen className="size-4" aria-hidden="true" />
        Report
      </Button>
    </div>
  );
}
