"use client";

import { useState } from "react";
import { Check, ExternalLink, Mail, RefreshCw } from "lucide-react";
import type { PipelineCompany } from "@/app/api/dashboard/pipeline/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  OUTCOME_LABELS,
  STAGE_CONFIG,
  STAGE_ORDER,
  TrendBadge,
  urgencyConfig,
  type OutcomeKey,
  type StageKey,
} from "@/components/pipeline/pipeline-config";

const SECTION_LABEL = "text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2";
const PILL_IDLE = "border-slate-200 dark:border-foreground/[0.08] text-slate-500 hover:border-slate-400";

interface PipelineAccountTabProps {
  company: PipelineCompany;
  rescoring: boolean;
  outcomeSaving: boolean;
  outcomeError: string | null;
  onStageChange: (domain: string, stage: StageKey) => void;
  onOutcome: (outcome: OutcomeKey | null) => void;
  onRescore: (domain: string) => void;
}

function StatusBadges({ company }: { company: PipelineCompany }) {
  const stage = (company.pipeline_stage ?? "cold") as StageKey;
  const stageCfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG.cold;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <Badge className={stageCfg.badgeClass}>{stageCfg.label}</Badge>
      <TrendBadge trend={company.trend} />
      {company.urgency ? (
        <span className={`border px-2 py-0.5 text-[10px] font-medium ${urgencyConfig(company.urgency)}`}>{company.urgency}</span>
      ) : null}
      {company.score_status ? (
        <span className="border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-foreground/[0.10]">
          {company.score_status}
          {company.data_coverage != null ? ` · ${Math.round(company.data_coverage * 100)}% coverage` : ""}
        </span>
      ) : null}
    </div>
  );
}

function StageSelector({ company, onStageChange }: Pick<PipelineAccountTabProps, "company" | "onStageChange">) {
  return (
    <div>
      <p className={SECTION_LABEL}>Pipeline Stage</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pipeline stage">
        {STAGE_ORDER.map((stage) => {
          const cfg = STAGE_CONFIG[stage];
          const isActive = company.pipeline_stage === stage;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStageChange(company.domain, stage)}
              className={`cursor-pointer border px-2.5 py-1 text-[10px] transition-colors ${isActive ? cfg.badgeClass : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-foreground/[0.08] dark:hover:border-foreground/[0.15] dark:hover:text-slate-400"}`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OutcomeSelector({ company, outcomeSaving, outcomeError, onOutcome }: Pick<PipelineAccountTabProps, "company" | "outcomeSaving" | "outcomeError" | "onOutcome">) {
  return (
    <div>
      <p className={SECTION_LABEL}>Score outcome</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Score outcome">
        {(Object.keys(OUTCOME_LABELS) as OutcomeKey[]).map((outcome) => {
          const active = company.outcome?.outcome === outcome;
          return (
            <button
              key={outcome}
              type="button"
              aria-pressed={active}
              disabled={!company.score_id || outcomeSaving}
              onClick={() => onOutcome(outcome)}
              className={`border px-2.5 py-1 text-[10px] transition-colors disabled:opacity-50 ${active ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)]" : PILL_IDLE}`}
            >
              {OUTCOME_LABELS[outcome]}
            </button>
          );
        })}
        {company.outcome ? (
          <button type="button" disabled={outcomeSaving} onClick={() => onOutcome(null)} className="border border-slate-200 px-2.5 py-1 text-[10px] text-slate-500 dark:border-foreground/[0.08]">
            Clear
          </button>
        ) : null}
      </div>
      {!company.score_id ? (
        <p className="mt-1 text-[10px] text-slate-500">Re-score this account to attach an outcome to an exact score snapshot.</p>
      ) : null}
      {outcomeError ? <p className="mt-1 text-[10px] text-red-400" role="alert">{outcomeError}</p> : null}
    </div>
  );
}

function TextCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 bg-slate-50 px-4 py-3 dark:border-foreground/[0.08] dark:bg-foreground/[0.03]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {children}
    </div>
  );
}

/** Pipeline controls for one account, shown as the first tab of the shared account panel. */
export function PipelineAccountTab({ company, rescoring, outcomeSaving, outcomeError, onStageChange, onOutcome, onRescore }: PipelineAccountTabProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  function copyEmail() {
    const text = [company.email_subject, company.talk_track].filter(Boolean).join("\n\n");
    void navigator.clipboard.writeText(text).catch(() => undefined);
    setEmailCopied(true);
    window.setTimeout(() => setEmailCopied(false), 2000);
  }

  return (
    <div className="space-y-4" data-slot="pipeline-account-tab">
      <StatusBadges company={company} />
      <StageSelector company={company} onStageChange={onStageChange} />
      <OutcomeSelector company={company} outcomeSaving={outcomeSaving} outcomeError={outcomeError} onOutcome={onOutcome} />

      {company.key_triggers && company.key_triggers.length > 0 ? (
        <div>
          <p className={SECTION_LABEL}>Key Triggers</p>
          <div className="flex flex-wrap gap-2">
            {company.key_triggers.map((trigger, index) => (
              <span key={index} className="border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:border-foreground/[0.08] dark:bg-foreground/[0.06] dark:text-slate-300">{trigger}</span>
            ))}
          </div>
        </div>
      ) : null}

      {company.email_subject ? (
        <TextCard label="Email Subject"><p className="font-mono text-sm text-slate-600 dark:text-slate-300">{company.email_subject}</p></TextCard>
      ) : null}
      {company.talk_track ? (
        <TextCard label="Talk Track"><p className="text-sm italic text-slate-400">{company.talk_track}</p></TextCard>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          className="flex-1 cursor-pointer gap-1.5 border-0 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)]"
          onClick={copyEmail}
          disabled={!company.email_subject && !company.talk_track}
        >
          {emailCopied ? <><Check className="h-4 w-4" />Copied!</> : <><Mail className="h-4 w-4" />Copy Email + Talk Track</>}
        </Button>
        <Button variant="outline" onClick={() => onRescore(company.domain)} disabled={rescoring} className="cursor-pointer gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${rescoring ? "animate-spin" : ""}`} />
          {rescoring ? "Scoring…" : "Re-score"}
        </Button>
        <Button variant="outline" className="cursor-pointer gap-1.5" asChild>
          <a href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.company_name)}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            LinkedIn
          </a>
        </Button>
      </div>
    </div>
  );
}
