"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  RefreshCw,
  ExternalLink,
  Check,
  Activity,
} from "lucide-react";
import type { PipelineCompany, PipelineSignals } from "@/app/api/dashboard/pipeline/route";
import { BandPill, CompanyMark, bandForScore } from "@/components/score/band";
import { EmptyState } from "@/components/app-ui/page-primitives";
import type { ScoreBand } from "@/lib/types";
import { cn } from "@/lib/utils";

type StageKey = "cold" | "warming" | "hot" | "engaged" | "converted";
type OutcomeKey = "closed_won" | "closed_lost" | "no_decision" | "disqualified";

const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  closed_won: "Closed won",
  closed_lost: "Closed lost",
  no_decision: "No decision",
  disqualified: "Disqualified",
};

const STAGE_ORDER: StageKey[] = ["cold", "warming", "hot", "engaged", "converted"];

const STAGE_CONFIG: Record<StageKey, {
  label: string;
  desc: string;
  action: string;
  color: string;
  badgeClass: string;
}> = {
  cold: {
    label: "Cold",
    desc: "Nurture",
    action: "Send awareness content",
    color: "var(--text-tertiary)",
    badgeClass: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  },
  warming: {
    label: "Warming",
    desc: "Follow Up",
    action: "Reference their recent signal",
    color: "#f5b544",
    badgeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  },
  hot: {
    label: "Hot",
    desc: "Act Now",
    action: "Book a call — use trigger in pitch",
    color: "#4ade80",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
  engaged: {
    label: "Engaged",
    desc: "In Outreach",
    action: "Send proposal or follow up",
    color: "var(--foreground)",
    badgeClass: "border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)]",
  },
  converted: {
    label: "Converted",
    desc: "Won",
    action: "Request a referral",
    color: "#a78bfa",
    badgeClass: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
  },
};

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

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  if (trend > 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-medium">
      <TrendingUp className="h-3 w-3" />+{trend}
    </span>
  );
  if (trend < 0) return (
    <span className="flex items-center gap-0.5 text-xs text-red-400 font-medium">
      <TrendingDown className="h-3 w-3" />{trend}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-slate-500 font-medium">
      <Minus className="h-3 w-3" />0
    </span>
  );
}

/** Colour comes from the score, never from the kanban column the card sits in. */
function bandOf(company: Pick<PipelineCompany, "score" | "score_band">): ScoreBand | null {
  if (company.score_band) return company.score_band;
  return company.score == null ? null : bandForScore(company.score);
}

function urgencyConfig(urgency: string | null): string {
  if (urgency === "act-now") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (urgency === "this-week") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (urgency === "this-month") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
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
  onSelect,
}: {
  company: PipelineCompany;
  onSelect: (c: PipelineCompany) => void;
}) {
  const priorityLevel = priorityFromUrgency(company.urgency);
  const band = bandOf(company);

  return (
    <div
      className="kcard outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      role="button"
      tabIndex={0}
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
  onSelect,
  onStageChange,
}: {
  stage: StageKey;
  companies: PipelineCompany[];
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
            <KanbanCard key={company.id} company={company} onSelect={onSelect} />
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
  const [selected, setSelected] = useState<PipelineCompany | null>(null);
  const [rescoring, setRescoring] = useState<string | null>(null);
  const [dialogEmailCopied, setDialogEmailCopied] = useState(false);
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

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
      setSelected((prev) =>
        prev?.domain === domain
          ? {
              ...prev,
              score: data.intent_score,
              score_band: data.score_band,
              trend: prev.score != null ? data.intent_score - prev.score : null,
              email_subject: data.email_subject ?? prev.email_subject,
              talk_track: data.talk_track ?? prev.talk_track,
              ai_summary: data.ai_summary ?? prev.ai_summary,
              key_triggers: data.key_triggers ?? prev.key_triggers,
              urgency: data.urgency ?? prev.urgency,
              score_id: data.score_id ?? prev.score_id,
              score_status: data.score_status ?? prev.score_status,
              data_coverage: data.data_coverage ?? prev.data_coverage,
              outcome: data.score_id && data.score_id !== prev.score_id ? null : prev.outcome,
            }
          : prev
      );
    } finally {
      setRescoring(null);
    }
  }

  async function handleStageChange(domain: string, stage: StageKey) {
    try {
      const res = await fetch("/api/dashboard/pipeline/stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, stage }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) => (c.domain === domain ? { ...c, pipeline_stage: stage } : c))
        );
      }
    } catch { /* ignore */ }
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
      setSelected((current) => current ? { ...current, outcome: nextOutcome } : current);
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

  function handleCopyDialogEmail() {
    if (!selected) return;
    const text = [selected.email_subject, selected.talk_track].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setDialogEmailCopied(true);
    setTimeout(() => setDialogEmailCopied(false), 2000);
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

  const selectedStage = selected ? ((selected.pipeline_stage ?? "cold") as StageKey) : "cold";
  const selectedCfg = selected ? STAGE_CONFIG[selectedStage] : null;
  const selectedBand = selected ? bandOf(selected) : null;

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
                onSelect={setSelected}
                onStageChange={handleStageChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setDialogEmailCopied(false); setOutcomeError(null); } }}>
        <DialogContent className="border-slate-200 dark:border-foreground/[0.08] bg-white dark:bg-[#0c1122] max-w-lg">
          {selected && selectedCfg && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap pr-6">
                  <DialogTitle className="text-slate-800 dark:text-slate-100 text-lg">{selected.company_name}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`${selectedCfg.badgeClass}`}>{selectedCfg.label}</Badge>
                    <span className="text-2xl font-semibold tabular-nums text-foreground">{selected.score ?? "—"}</span>
                    {selectedBand ? <BandPill band={selectedBand} /> : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                  <span>{selected.domain}</span>
                  <TrendBadge trend={selected.trend} />
                  {selected.urgency && (
                    <span className={`text-[10px] px-2 py-0.5 border font-medium ${urgencyConfig(selected.urgency)}`}>
                      {selected.urgency}
                    </span>
                  )}
                  {selected.score_status && (
                    <span className="text-[10px] border border-slate-200 dark:border-foreground/[0.10] px-2 py-0.5 text-slate-500">
                      {selected.score_status}
                      {selected.data_coverage != null
                        ? ` · ${Math.round(selected.data_coverage * 100)}% coverage`
                        : ""}
                    </span>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Stage selector */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Pipeline Stage</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {STAGE_ORDER.map((s) => {
                      const sCfg = STAGE_CONFIG[s];
                      const isActive = selectedStage === s;
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            handleStageChange(selected.domain, s);
                            setSelected({ ...selected, pipeline_stage: s });
                          }}
                          className={`text-[10px] px-2.5 py-1 border transition-colors cursor-pointer ${
                            isActive ? sCfg.badgeClass : "border-slate-200 dark:border-foreground/[0.08] text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:border-slate-300 dark:hover:border-foreground/[0.15]"
                          }`}
                        >
                          {sCfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Score outcome
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(Object.keys(OUTCOME_LABELS) as OutcomeKey[]).map((outcome) => {
                      const active = selected.outcome?.outcome === outcome;
                      return (
                        <button
                          key={outcome}
                          disabled={!selected.score_id || outcomeSaving}
                          onClick={() => handleOutcome(outcome)}
                          className={`text-[10px] px-2.5 py-1 border transition-colors disabled:opacity-50 ${
                            active
                              ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                              : "border-slate-200 dark:border-foreground/[0.08] text-slate-500 hover:border-slate-400"
                          }`}
                        >
                          {OUTCOME_LABELS[outcome]}
                        </button>
                      );
                    })}
                    {selected.outcome && (
                      <button
                        disabled={outcomeSaving}
                        onClick={() => handleOutcome(null)}
                        className="text-[10px] px-2.5 py-1 border border-slate-200 dark:border-foreground/[0.08] text-slate-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {!selected.score_id && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Re-score this account to attach an outcome to an exact score snapshot.
                    </p>
                  )}
                  {outcomeError && <p className="mt-1 text-[10px] text-red-400">{outcomeError}</p>}
                </div>

                {selected.ai_summary && (
                  <div className="bg-slate-50 dark:bg-foreground/[0.04] border border-slate-200 dark:border-foreground/[0.07] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">AI Analysis</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selected.ai_summary}</p>
                  </div>
                )}

                {selected.key_triggers && selected.key_triggers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Key Triggers</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.key_triggers.map((t, i) => (
                        <span key={i} className="text-xs bg-slate-100 dark:bg-foreground/[0.06] text-slate-600 dark:text-slate-300 px-2.5 py-1 border border-slate-200 dark:border-foreground/[0.08]">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.email_subject && (
                  <div className="border border-slate-200 dark:border-foreground/[0.08] bg-slate-50 dark:bg-foreground/[0.03] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Email Subject</p>
                    <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{selected.email_subject}</p>
                  </div>
                )}

                {selected.talk_track && (
                  <div className="border border-slate-200 dark:border-foreground/[0.08] bg-slate-50 dark:bg-foreground/[0.03] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Talk Track</p>
                    <p className="text-sm italic text-slate-400">{selected.talk_track}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap pt-1">
                  <Button
                    className="flex-1 cursor-pointer gap-1.5 border-0 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)]"
                    onClick={handleCopyDialogEmail}
                    disabled={!selected.email_subject && !selected.talk_track}
                  >
                    {dialogEmailCopied ? <><Check className="h-4 w-4" />Copied!</> : <><Mail className="h-4 w-4" />Copy Email + Talk Track</>}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRescore(selected.domain)}
                    disabled={rescoring === selected.domain}
                    className="border-slate-200 dark:border-foreground/[0.10] text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-foreground/[0.05] cursor-pointer gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${rescoring === selected.domain ? "animate-spin" : ""}`} />
                    {rescoring === selected.domain ? "Scoring…" : "Re-score"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-200 dark:border-foreground/[0.10] text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-foreground/[0.05] cursor-pointer gap-1.5"
                    asChild
                  >
                    <a
                      href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(selected.company_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
