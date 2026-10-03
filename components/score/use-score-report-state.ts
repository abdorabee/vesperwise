"use client";

import { useCallback, useMemo, useState } from "react";
import { useShellStatus } from "@/components/dashboard/shell/shell-status";
import { buildScoreReports, latestReportId, type ScoreReport, type ScoreReportSource } from "@/components/score/score-report-model";

// Same trigger rows ScoreResearchStatus counts; web/GitHub are context, not progress steps.
const TRIGGER_SIGNALS = ["funding", "hiring", "news", "technology"] as const;

function statusMessageFor(report: Extract<ScoreReport, { kind: "pending" }> | null) {
  if (!report) return null;
  const signals = report.progress?.signals ?? {};
  const landed = TRIGGER_SIGNALS.filter((key) => signals[key]).length;
  const step = report.progress?.reasoning === "running"
    ? "writing summary"
    : `${landed}/${TRIGGER_SIGNALS.length} signals`;
  return { text: `Scoring ${report.domain} · ${step}`, busy: true };
}

export function useScoreReportState(sources: ScoreReportSource[]) {
  const [selection, setSelection] = useState<{ id: string | null; latest: string | null } | null>(null);
  const [panelPreference, setPanelPreference] = useState<{ open: boolean; latest: string | null } | null>(null);
  const reports = useMemo(() => buildScoreReports(sources), [sources]);
  const latestReport = latestReportId(reports);
  const selectedReportId = selection?.latest === latestReport ? selection.id : latestReport;
  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports.at(-1) ?? null;
  const runningReport = reports.findLast((report): report is Extract<ScoreReport, { kind: "pending" }> => report.kind === "pending") ?? null;
  const statusMessage = useMemo(() => statusMessageFor(runningReport), [runningReport]);
  const defaultOpen = typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches;
  const reportPanelOpen = Boolean(latestReport && (
    panelPreference?.latest === latestReport ? panelPreference.open : defaultOpen
  ));

  useShellStatus(statusMessage);

  const setSelectedReportId = useCallback((id: string | null) => {
    setSelection({ id, latest: latestReport });
  }, [latestReport]);

  const setReportPanelOpen = useCallback((open: boolean) => {
    setPanelPreference({ open, latest: latestReport });
  }, [latestReport]);

  return {
    reports,
    selectedReport,
    selectedReportId,
    setSelectedReportId,
    reportPanelOpen,
    setReportPanelOpen,
  };
}
