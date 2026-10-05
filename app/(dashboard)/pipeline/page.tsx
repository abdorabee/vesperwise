"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { AccountPanel } from "@/components/account-panel/account-panel";
import { useAccountParam } from "@/components/account-panel/use-account-param";
import { PipelineAccountTab } from "@/components/pipeline/pipeline-account-tab";
import { PipelineAccountsColumn } from "@/components/pipeline/pipeline-accounts-column";
import type { PipelineCompany, PipelineSignals } from "@/app/api/dashboard/pipeline/route";
import { BandPill, CompanyMark } from "@/components/score/band";
import { EmptyState } from "@/components/app-ui/page-primitives";
import type { ScoreBand } from "@/lib/types";
import { cn } from "@/lib/utils";

import { STAGE_CONFIG, STAGE_ORDER, bandOf, type OutcomeKey, type StageKey } from "@/components/pipeline/pipeline-config";

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

type PriorityLevel = "urgent" | "high" | "med" | "low";

function priorityFromUrgency(urgency: string | null): PriorityLevel {
  if (urgency === "act-now") return "urgent";
  if (urgency === "this-week") return "high";
  if (urgency === "this-month") return "med";
  return "low";
}

function PriorityIcon({ level }: { level: PriorityLevel }) {
  if (level === "urgent") {
    return (
      <span className={`priority pri-urgent`}>
        <svg viewBox="0 0 10 10" fill="currentColor" width="10" height="10">
          <circle cx="5" cy="5" r="4" />
        </svg>
      </span>
    );
  }
  if (level === "high") {
    return (
      <span className={`priority pri-high`}>
        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
          <rect x="1" y="4" width="2" height="5" fill="currentColor" stroke="none" />
          <rect x="4" y="2" width="2" height="7" fill="currentColor" stroke="none" />
          <rect x="7" y="5" width="2" height="4" fill="none" />
        </svg>
      </span>
    );
  }
  if (level === "med") {
    return (
      <span className={`priority pri-med`}>
        <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
          <rect x="1" y="4" width="2" height="5" fill="currentColor" stroke="none" />
          <rect x="4" y="2" width="2" height="7" fill="none" />
          <rect x="7" y="5" width="2" height="4" fill="none" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`priority pri-low`}>
      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10">
        <rect x="1" y="4" width="2" height="5" fill="none" />
        <rect x="4" y="2" width="2" height="7" fill="none" />
        <rect x="7" y="5" width="2" height="4" fill="none" />
      </svg>
    </span>
  );
}


const SIGNAL_LABELS: Array<{ key: keyof PipelineSignals; label: string }> = [
  { key: "funding", label: "fund" },
  { key: "hiring", label: "hire" },
  { key: "news", label: "news" },
  { key: "technology", label: "tech" },
  { key: "web_activity", label: "web" },
];

function SignalPills({ signals }: { signals: PipelineSignals }) {
  const pills = SIGNAL_LABELS.flatMap(({ key, label }) => {
    const s = signals[key];
    if (!s || s.score === 0) return [];
    return [{ label, score: s.score }];
  }).slice(0, 3);

  if (pills.length === 0) return null;

  return (
    <div className="signal-tags">
      {pills.map((p) => (
        <span key={p.label} className="signal-tag">
          <span style={{ color: "var(--text-tertiary)" }}>{p.label}:</span>{p.score}
        </span>
      ))}
    </div>
  );
}

function KanbanCard({
  company,
  selected,
  onSelect,
}: {
  company: PipelineCompany;
  selected: boolean;
  onSelect: (c: PipelineCompany) => void;
}) {
  const priorityLevel = priorityFromUrgency(company.urgency);
  const band = bandOf(company);

  return (
    <div
      className="kcard outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      data-selected={selected}
      aria-label={`${company.company_name}${company.score != null ? `, score ${company.score}` : ""}${band ? `, ${band}` : ""}. Open details`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", company.domain);
        e.dataTransfer.effectAllowed = "move";
        (e.currentTarget as HTMLElement).style.opacity = "0.5";
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = "1";
      }}
      onClick={() => onSelect(company)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(company);
        }
      }}
    >
      <div className="row-head">
        <CompanyMark domain={company.domain} name={company.company_name} size={16} className="rounded" />
        <div className="name">{company.company_name}</div>
        <PriorityIcon level={priorityLevel} />
      </div>
      <div className="mb-1.5 truncate text-[11px] text-muted-foreground">{company.domain}</div>
      {(company.ai_summary || company.key_triggers?.[0]) && (
        <div className="summary">{company.ai_summary || company.key_triggers?.[0]}</div>
      )}
      {company.signals && (
        <SignalPills signals={company.signals} />
      )}
      <div className="meta">
        <div className="meta-left">
          <span className="text-sm font-semibold tabular-nums text-foreground">{company.score ?? "—"}</span>
          {band ? <BandPill band={band} size="sm" /> : null}
        </div>
        <span className="when">{relTime(company.last_scored)}</span>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  companies,
  selectedDomain,
  onSelect,
  onStageChange,
}: {
  stage: StageKey;
  companies: PipelineCompany[];
  selectedDomain: string | null;
  onSelect: (c: PipelineCompany) => void;
  onStageChange: (domain: string, stage: StageKey) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const cfg = STAGE_CONFIG[stage];

  return (
    <div
      className="kcol"
      style={dragOver ? { outline: "2px solid var(--ring)", outlineOffset: "-1px" } : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const domain = e.dataTransfer.getData("text/plain");
        if (domain) onStageChange(domain, stage);
      }}
    >
      <div className="kcol-head">
        <span
          className="indicator"
          style={{ background: cfg.color }}
        />
        <span className="name">{cfg.label}</span>
        <span className="count">{companies.length}</span>
        {companies.length > 0 && (
          <span className="meta">
            avg {Math.round(companies.reduce((s, c) => s + (c.score ?? 0), 0) / companies.length)}
          </span>
        )}
      </div>
      <div className="kcards">
        {companies.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {dragOver ? `Drop here → ${cfg.label}` : `No ${cfg.label.toLowerCase()} companies`}
          </div>
        ) : (
          companies.map((company) => (
            <KanbanCard key={company.id} company={company} selected={company.domain.toLowerCase() === selectedDomain} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

type BandFilter = "ALL" | ScoreBand;
const BAND_FILTERS: BandFilter[] = ["ALL", "HOT", "WARM", "COLD"];

export default function PipelinePage() {
  const [bandFilter, setBandFilter] = useState<BandFilter>("ALL");
  const [companies, setCompanies] = useState<PipelineCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState<string | null>(null);
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const { account, openAccount, closeAccount } = useAccountParam();
  const selected = account ? companies.find((c) => c.domain.toLowerCase() === account) ?? null : null;

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/pipeline");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  async function handleRescore(domain: string) {
    setRescoring(domain);
    try {
      const res = await fetch(`/api/v1/score?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) return;
      const data = await res.json();
      setCompanies((prev) =>
        prev.map((c) =>
          c.domain === domain
            ? {
                ...c,
                score: data.intent_score,
                score_band: data.score_band,
                trend: c.score != null ? data.intent_score - c.score : null,
                email_subject: data.email_subject ?? c.email_subject,
                talk_track: data.talk_track ?? c.talk_track,
                ai_summary: data.ai_summary ?? c.ai_summary,
                key_triggers: data.key_triggers ?? c.key_triggers,
                urgency: data.urgency ?? c.urgency,
                last_scored: new Date().toISOString(),
                score_id: data.score_id ?? c.score_id,
                score_status: data.score_status ?? c.score_status,
                data_coverage: data.data_coverage ?? c.data_coverage,
                outcome: data.score_id && data.score_id !== c.score_id ? null : c.outcome,
              }
            : c
        )
      );
    } finally {
      setRescoring(null);
    }
  }

  async function handleStageChange(domain: string, stage: StageKey) {
    const previous = companies.find((c) => c.domain === domain)?.pipeline_stage ?? "cold";
    const setStage = (next: string) => setCompanies((prev) =>
      prev.map((c) => (c.domain === domain ? { ...c, pipeline_stage: next } : c))
    );
    // Optimistic so the card and the open account panel move together; roll back on failure.
    setStage(stage);
    try {
      const res = await fetch("/api/dashboard/pipeline/stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, stage }),
      });
      if (!res.ok) setStage(previous);
    } catch {
      setStage(previous);
    }
  }

  async function handleOutcome(outcome: OutcomeKey | null) {
    if (!selected?.score_id) return;
    setOutcomeSaving(true);
    setOutcomeError(null);
    try {
      const res = await fetch("/api/dashboard/pipeline/outcomes", {
        method: outcome ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outcome
          ? { score_id: selected.score_id, outcome }
          : { score_id: selected.score_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to save outcome");
      const nextOutcome = outcome
        ? {
            outcome,
            occurred_at: data.outcome?.occurred_at ?? new Date().toISOString(),
            value: data.outcome?.value ?? null,
            reason: data.outcome?.reason ?? null,
          }
        : null;
      setCompanies((current) => current.map((company) =>
        company.score_id === selected.score_id
          ? { ...company, outcome: nextOutcome }
          : company
      ));
    } catch (error) {
      setOutcomeError(error instanceof Error ? error.message : "Unable to save outcome");
    } finally {
      setOutcomeSaving(false);
    }
  }


  const bandCounts = { HOT: 0, WARM: 0, COLD: 0 } as Record<ScoreBand, number>;
  for (const c of companies) {
    const b = bandOf(c);
    if (b) bandCounts[b] += 1;
  }
  const visible = bandFilter === "ALL" ? companies : companies.filter((c) => bandOf(c) === bandFilter);

  const grouped: Record<StageKey, PipelineCompany[]> = { cold: [], warming: [], hot: [], engaged: [], converted: [] };
  for (const c of visible) {
    const stage = (c.pipeline_stage ?? "cold") as StageKey;
    if (grouped[stage]) {
      grouped[stage].push(c);
    } else {
      grouped.cold.push(c);
    }
  }
  for (const stage of STAGE_ORDER) {
    grouped[stage].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }


  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-[-0.02em] text-foreground">Intent Hub</h1>
          <p className="text-xs tabular-nums text-muted-foreground">
            {companies.length} watched {companies.length === 1 ? "account" : "accounts"} ·{" "}
            <span className="hidden md:inline">drag cards between stages</span>
            <span className="md:hidden">Tap a card to change its stage</span>
          </p>
        </div>
        {companies.length > 0 ? (
          <div role="group" aria-label="Filter by score band" className="ml-auto inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {BAND_FILTERS.map((f) => {
              const active = bandFilter === f;
              const count = f === "ALL" ? companies.length : bandCounts[f];
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBandFilter(f)}
                  className={cn(
                    "inline-flex min-h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-[background-color,color] duration-150 active:scale-[0.96] motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "ALL" ? "All" : f}
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground" role="status">
          Loading…
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          className="flex-1"
          icon={<Activity className="size-5" aria-hidden="true" />}
          title="No accounts in the Intent Hub yet"
          description="Add companies to your watchlist and they appear here, sorted by score into stages you can drag them through."
          action={
            <Button asChild>
              <Link href="/watchlist">Go to Watchlist</Link>
            </Button>
          }
        />
      ) : (
        <div className="kanban-wrap">
          <div className="kanban">
            {STAGE_ORDER.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                companies={grouped[stage]}
                selectedDomain={account}
                onSelect={(company) => openAccount(company.domain)}
                onStageChange={handleStageChange}
              />
            ))}
          </div>
        </div>
      )}

      <PipelineAccountsColumn companies={companies} selectedDomain={account} onSelect={openAccount} />

      {account ? (
        <AccountPanel
          domain={account}
          onClose={() => { closeAccount(); setOutcomeError(null); }}
          extraTab={selected ? {
            value: "pipeline",
            label: "Pipeline",
            content: (
              <PipelineAccountTab
                company={selected}
                rescoring={rescoring === selected.domain}
                outcomeSaving={outcomeSaving}
                outcomeError={outcomeError}
                onStageChange={handleStageChange}
                onOutcome={handleOutcome}
                onRescore={handleRescore}
              />
            ),
          } : undefined}
        />
      ) : null}
    </div>
  );
}
