"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RotateCcw, X } from "lucide-react";
import { LivingBrief } from "@/components/score/brief/living-brief";
import { GenUiWorkspace, type GenUiHandlers } from "@/components/score/gen-ui/workspace";
import { ScoreResearchStatus } from "@/components/score/score-research-status";
import { buildScoreReport, type ScoreReport } from "@/components/score/score-report-model";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BriefSpec } from "@/lib/brief";
import type { UiBlock } from "@/lib/gen-ui";
import { formatAbsoluteDate, formatRelativeTime } from "@/lib/time-ago";

type ReportTab = { value: string; label: string; include: UiBlock["type"][] };

/** A page-specific tab (e.g. Pipeline stage controls) shown before the report tabs. */
export interface ReportExtraTab { value: string; label: string; content: ReactNode }

const REPORT_TABS: ReportTab[] = [
  { value: "overview", label: "Overview", include: ["living_brief", "intent_hero", "thesis", "comparison", "markdown"] },
  { value: "evidence", label: "Evidence", include: ["signal_explorer"] },
  { value: "outreach", label: "Outreach", include: ["outreach_studio"] },
];

export { buildScoreReport };

export function tabGroupsForBlocks(blocks: UiBlock[]) {
  return REPORT_TABS.filter((tab) => blocks.some((block) => tab.include.includes(block.type)));
}

function StoredResultBar({ createdAt, busy, onRescore }: { createdAt: string; busy: boolean; onRescore: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
      <span suppressHydrationWarning title={formatAbsoluteDate(createdAt) ?? undefined}>Stored result · scored {formatRelativeTime(createdAt) ?? "earlier"}</span>
      <Button type="button" size="xs" variant="outline" disabled={busy} onClick={onRescore}><RotateCcw className="size-3.5" aria-hidden="true" />Rescore · 1 credit</Button>
    </div>
  );
}

function PanelHeader({ report, onClose, closeLabel }: { report: ScoreReport; onClose: () => void; closeLabel: string }) {
  const title = report.kind === "pending" ? report.domain : report.company ?? report.domain ?? report.label;
  const domain = report.kind === "pending" ? report.domain : report.domain;
  return (
    <header className="flex shrink-0 items-start gap-3 border-b border-border/70 px-4 py-3">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        {domain && domain !== title ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{domain}</p> : null}
      </div>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={closeLabel} onClick={onClose}>
        <X className="size-4" aria-hidden="true" />
      </Button>
    </header>
  );
}

function ReportBlocks({ report, include, handlers }: { report: Extract<ScoreReport, { kind: "ui" }>; include: UiBlock["type"][]; handlers: GenUiHandlers }) {
  return (
    <div data-motion={report.restored ? "restored" : "generated"}>
      <GenUiWorkspace blocks={report.blocks} include={include} handlers={handlers} fresh={report.fresh} />
    </div>
  );
}

const SCORE_ONLY_SPEC: BriefSpec = {
  version: 1,
  headline: "",
  personas: [],
  openers: {},
  layout: [{ type: "score_hero" }, { type: "timing_slider" }],
};

function pendingLivingBriefBlock(report: Extract<ScoreReport, { kind: "pending" }>): Extract<UiBlock, { type: "living_brief" }> | null {
  if (!report.score) return null;
  return {
    type: "living_brief",
    company: report.score.company,
    domain: report.score.domain,
    intent_score: report.score.intent_score,
    score_band: report.score.score_band,
    last_updated: report.score.last_updated,
    data_coverage: report.score.data_coverage,
    contributions: report.score.contributions,
    // Until the model's first sections arrive, show only what the score already
    // proves (hero + timing); the composed sections then stream in after it.
    spec: report.brief ?? SCORE_ONLY_SPEC,
  };
}

export function ScoreReportPanel({
  report,
  handlers,
  busy,
  onClose,
  onRescore,
  extraTab,
  closeLabel = "Close report panel",
}: {
  report: ScoreReport;
  handlers: GenUiHandlers;
  busy: boolean;
  onClose: () => void;
  onRescore: (domain: string) => void;
  extraTab?: ReportExtraTab;
  closeLabel?: string;
}) {
  const groups = useMemo(() => report.kind === "ui" ? tabGroupsForBlocks(report.blocks) : [], [report]);
  const pendingBrief = report.kind === "pending" ? pendingLivingBriefBlock(report) : null;
  const tabValues = extraTab ? [extraTab.value, ...groups.map((group) => group.value)] : groups.map((group) => group.value);
  const [activeTab, setActiveTab] = useState(tabValues[0] ?? "overview");
  const activeValue = tabValues.includes(activeTab) ? activeTab : tabValues[0] ?? "overview";
  const actionRail = report.kind === "ui" && report.blocks.some((block) => block.type === "action_rail");

  return (
    <div className="score-report-panel flex h-full min-h-0 flex-col bg-background">
      <PanelHeader report={report} onClose={onClose} closeLabel={closeLabel} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {report.kind === "pending" ? (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Scoring {report.domain}</p>
            <ScoreResearchStatus mode="score" progress={report.progress} />
            {pendingBrief ? (
              <div className="border-t border-border/70 pt-4">
                <LivingBrief block={pendingBrief} handlers={{ onPrompt: handlers.onPrompt, pending: true }} fresh />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {report.stored ? <StoredResultBar createdAt={report.stored.createdAt} busy={busy} onRescore={() => onRescore(report.stored!.domain)} /> : null}
            {tabValues.length <= 1 ? (
              groups[0] ? <ReportBlocks report={report} include={groups[0].include} handlers={handlers} /> : extraTab?.content ?? null
            ) : (
              <Tabs value={activeValue} onValueChange={setActiveTab} className="min-h-0">
                <TabsList>
                  {extraTab ? <TabsTrigger value={extraTab.value}>{extraTab.label}</TabsTrigger> : null}
                  {groups.map((group) => <TabsTrigger key={group.value} value={group.value}>{group.label}</TabsTrigger>)}
                </TabsList>
                {extraTab ? <TabsContent value={extraTab.value}>{extraTab.content}</TabsContent> : null}
                {groups.map((group) => (
                  <TabsContent key={group.value} value={group.value}>
                    <ReportBlocks report={report} include={group.include} handlers={handlers} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        )}
      </div>
      {report.kind === "ui" && actionRail ? (
        <footer className="shrink-0 border-t border-border/70 px-4 py-3">
          <GenUiWorkspace blocks={report.blocks} include={["action_rail"]} handlers={handlers} fresh={false} />
        </footer>
      ) : null}
    </div>
  );
}
