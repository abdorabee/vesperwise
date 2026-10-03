"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Copy, ListPlus, PenLine } from "lucide-react";
import { BandPill, CompanyMark, ScoreMeter, ScoreNumber } from "@/components/score/band";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SignalAxis, UiBlock, UiSuggestion } from "@/lib/gen-ui";
import { isMockSource, sourceLabel, stripMockMarker } from "@/lib/source-labels";
import { daysSince, formatAbsoluteDate, formatDaysAgo, formatRelativeTime } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

export interface GenUiHandlers {
  onWatchlist?: (company: string, domain: string) => void;
  watchlistByDomain?: Record<string, "adding" | "added">;
  onPrompt?: (prompt: string) => void;
}

type HeroBlock = Extract<UiBlock, { type: "intent_hero" }>;
type ExplorerBlock = Extract<UiBlock, { type: "signal_explorer" }>;
type ThesisBlock = Extract<UiBlock, { type: "thesis" }>;

const URGENCY_LABEL: Record<string, string> = {
  "act-now": "Act now",
  "this-week": "Act this week",
  "this-month": "Act this month",
  nurture: "Nurture",
};

const STAGE_LABEL: Record<string, string> = {
  awareness: "Awareness stage",
  consideration: "Consideration stage",
  decision: "Decision stage",
};

export function draftOutreachPrompt(company?: string) {
  return company ? `Draft a personalized outreach email for ${company}` : "Draft outreach";
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)}>{children}</h3>;
}

function SampleDataPill() {
  return (
    <span
      title="Signals in this result come from deterministic sample data, not live providers."
      className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
    >
      Sample data
    </span>
  );
}

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function IntentHero({ block, sampleData, fresh }: { block: HeroBlock; sampleData: boolean; fresh: boolean }) {
  const coverage = block.data_coverage == null ? null : `${Math.round(block.data_coverage * 100)}% coverage`;
  const fetched = formatRelativeTime(block.last_updated);
  const meta = [
    block.urgency ? URGENCY_LABEL[block.urgency] ?? block.urgency : null,
    block.buying_stage ? STAGE_LABEL[block.buying_stage] ?? block.buying_stage : null,
    block.icp_fit_score != null ? `ICP fit ${Math.round(block.icp_fit_score)}` : null,
  ].filter((item): item is string => Boolean(item));
  const site = safeUrl(`https://${block.domain}`);

  return (
    <header data-slot="score-hero" className="space-y-5 border-b border-border/70 pb-6">
      <div className="flex items-start gap-3">
        <CompanyMark domain={block.domain} name={block.company} size={36} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold tracking-[-0.035em] text-foreground">{block.company}</h2>
          {site ? (
            <a href={site} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-0.5 truncate text-sm text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {block.domain}<ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : <p className="mt-0.5 truncate text-sm text-muted-foreground">{block.domain}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right text-xs text-muted-foreground">
          {fetched ? <span suppressHydrationWarning title={formatAbsoluteDate(block.last_updated) ?? undefined}>Fetched {fetched}</span> : null}
          {sampleData ? <SampleDataPill /> : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <ScoreNumber value={block.intent_score} animate={fresh} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-1.5">
            <BandPill band={block.score_band} className={fresh ? "score-band-land" : undefined} />
            {meta.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {meta.map((item, index) => (
                  <span key={item}>
                    {index > 0 ? <span aria-hidden="true" className="px-1.5 text-border">·</span> : null}
                    <span className={index === 0 ? "font-medium text-foreground" : undefined}>{item}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
        <ScoreMeter value={block.intent_score} band={block.score_band} className="max-w-xl" />
        {coverage ? <p className="text-xs text-muted-foreground">{coverage}</p> : null}
      </div>
    </header>
  );
}

function isUnavailable(axis: SignalAxis) {
  return !axis.detail || axis.detail.trim().toLowerCase() === "unavailable";
}

function axisAgeDays(axis: SignalAxis): number | null {
  return daysSince(axis.observed_at) ?? (axis.days_ago == null ? null : Math.floor(axis.days_ago));
}

function SourceMeta({ axis, unavailable }: { axis: SignalAxis; unavailable: boolean }) {
  if (unavailable) return <span>Source unavailable</span>;
  const age = formatDaysAgo(axisAgeDays(axis));
  const absolute = formatAbsoluteDate(axis.observed_at);
  const name = isMockSource(axis.source) ? null : sourceLabel(axis.source);
  const url = safeUrl(axis.source_url);
  const parts: React.ReactNode[] = [];
  if (age) parts.push(<span key="age" suppressHydrationWarning title={absolute ?? undefined}>{age}</span>);
  else parts.push(<span key="age">Undated</span>);
  if (name && url) {
    parts.push(
      <a key="src" href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {name}<ArrowUpRight className="size-3 shrink-0" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
      </a>,
    );
  } else if (name) {
    parts.push(<span key="src">{name}</span>);
  }
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center">
          {index > 0 ? <span aria-hidden="true" className="px-1.5">·</span> : null}
          {part}
        </span>
      ))}
    </>
  );
}

function ContributionCell({ axis, scale, unavailable, context }: { axis: SignalAxis; scale: number; unavailable: boolean; context?: boolean }) {
  if (unavailable) return <span className="text-sm text-muted-foreground">—</span>;
  const hasContribution = !context && typeof axis.contribution === "number";
  const ratio = hasContribution
    ? (scale > 0 ? (axis.contribution ?? 0) / scale : 0)
    : axis.max > 0 ? axis.score / axis.max : 0;
  const label = hasContribution ? `+${Math.round(axis.contribution ?? 0)} pts` : `${axis.score} / ${axis.max}`;
  const tip = hasContribution ? `${axis.label} added ${axis.contribution} points to the score (read ${axis.score} / ${axis.max}).` : `${axis.label} read ${axis.score} of ${axis.max}.`;
  return (
    <span className="flex items-center gap-2" title={tip}>
      <span aria-hidden="true" className="relative h-1 w-14 shrink-0 overflow-hidden rounded-full bg-muted sm:w-16">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", context ? "bg-muted-foreground/50" : "bg-foreground/80")} style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
      </span>
      <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">{label}</span>
    </span>
  );
}

function EvidenceRows({ axes, context }: { axes: SignalAxis[]; context?: boolean }) {
  const scale = Math.max(0, ...axes.map((axis) => axis.contribution ?? 0));
  return (
    <ul className="divide-y divide-border/60">
      {axes.map((axis) => {
        const unavailable = isUnavailable(axis);
        const detail = unavailable ? "No current evidence available." : stripMockMarker(axis.detail ?? "");
        return (
          <li
            key={axis.key}
            data-slot="score-signal-row"
            className="score-artifact-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-3 py-3 sm:grid-cols-[7rem_8.5rem_minmax(0,1fr)] sm:items-start sm:gap-y-1 sm:px-4"
          >
            <span className="text-sm font-medium text-foreground sm:pt-px">{axis.label}</span>
            <span className="justify-self-end sm:justify-self-start sm:pt-1"><ContributionCell axis={axis} scale={scale} unavailable={unavailable} context={context} /></span>
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className={cn("text-sm leading-5", unavailable ? "text-muted-foreground" : "text-foreground/85")}>{detail}</p>
              <p className="mt-1 flex flex-wrap items-center text-xs text-muted-foreground"><SourceMeta axis={axis} unavailable={unavailable} /></p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function sortByContribution(axes: SignalAxis[]) {
  return axes.slice().sort((a, b) => {
    const ua = isUnavailable(a) ? 1 : 0;
    const ub = isUnavailable(b) ? 1 : 0;
    if (ua !== ub) return ua - ub;
    const ca = a.contribution ?? (a.max > 0 ? a.score / a.max : 0);
    const cb = b.contribution ?? (b.max > 0 ? b.score / b.max : 0);
    return cb - ca;
  });
}

function EvidenceTable({ block }: { block: ExplorerBlock }) {
  const triggers = sortByContribution(block.axes.filter((axis) => !axis.context));
  const context = block.axes.filter((axis) => axis.context);
  const verified = triggers.filter((axis) => !isUnavailable(axis)).length;
  return (
    <section aria-labelledby="score-evidence-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow><span id="score-evidence-title">Evidence</span></Eyebrow>
        <span className="text-xs tabular-nums text-muted-foreground">{verified} of {triggers.length} signals verified</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/70">
        <div aria-hidden="true" className="hidden grid-cols-[7rem_8.5rem_minmax(0,1fr)] gap-x-4 border-b border-border/70 bg-muted/35 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
          <span>Signal</span><span>Contribution</span><span>Dated evidence</span>
        </div>
        <EvidenceRows axes={triggers} />
      </div>
      {context.length > 0 ? (
        <details className="group rounded-lg border border-border/70">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors duration-150 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
            <span className="font-medium text-foreground">Supporting context</span>
            <span className="text-xs text-muted-foreground">excluded from score · {context.map((axis) => axis.label).join(", ")}</span>
          </summary>
          <div className="border-t border-border/70"><EvidenceRows axes={context} context /></div>
        </details>
      ) : null}
    </section>
  );
}

function WhyNow({ block }: { block: ThesisBlock }) {
  const lead = block.why_now || block.summary;
  return (
    <section className="score-artifact-copy space-y-2">
      <Eyebrow>Why now</Eyebrow>
      <p className="text-pretty text-[15px] leading-7 text-foreground sm:text-base">{lead}</p>
      {block.why_now && block.summary !== block.why_now ? <p className="text-pretty text-sm leading-6 text-muted-foreground">{block.summary}</p> : null}
    </section>
  );
}

function NextMove({ block, company, onPrompt }: { block: ThesisBlock; company?: string; onPrompt?: (prompt: string) => void }) {
  if (!block.recommended_action) return null;
  return (
    <section className="score-artifact-action rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4 sm:p-5">
      <Eyebrow className="text-foreground/70">Recommended next move</Eyebrow>
      <p className="mt-1.5 text-pretty text-[15px] font-medium leading-6 text-foreground">{block.recommended_action}</p>
      {onPrompt ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="brand"
            onClick={() => onPrompt(draftOutreachPrompt(company))}
          >
            <PenLine className="size-4" aria-hidden="true" />Draft outreach
          </Button>
          {company ? (
            <Button type="button" size="sm" variant="ghost" className="text-foreground" onClick={() => onPrompt(`Who should I talk to at ${company} and what's the angle?`)}>Who to call</Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function OutreachStudio({ block, onPrompt }: { block: Extract<UiBlock, { type: "outreach_studio" }>; onPrompt?: (prompt: string) => void }) {
  const [subject, setSubject] = useState(block.subject ?? "");
  const [body, setBody] = useState(block.talk_track ?? "");
  const [copied, setCopied] = useState(false);
  async function copy() {
    const text = [subject, body].filter(Boolean).join("\n\n");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <section className="space-y-4 rounded-lg border border-border/70 bg-card/40 p-4">
      <div><h3 className="text-sm font-semibold text-foreground">Outreach draft</h3><p className="mt-1 text-xs text-muted-foreground">Edit directly, then copy or refine it in the conversation.</p></div>
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Subject<input className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Message<textarea className="min-h-36 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void copy()} disabled={!subject && !body}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy"}</Button>{onPrompt ? <Button type="button" size="sm" variant="ghost" onClick={() => onPrompt("Rewrite this outreach to be shorter and more specific to the strongest trigger.")}>Refine</Button> : null}</div>
    </section>
  );
}

function ActionRail({ block, handlers }: { block: Extract<UiBlock, { type: "action_rail" }>; handlers: GenUiHandlers }) {
  const status = handlers.watchlistByDomain?.[block.domain];
  return (
    <div className="score-artifact-actions flex flex-wrap gap-2 pt-1">
      {handlers.onWatchlist ? <Button type="button" size="sm" variant="outline" onClick={() => handlers.onWatchlist?.(block.company, block.domain)} disabled={status === "adding" || status === "added"}><ListPlus className="size-4" />{status === "added" ? "Watching" : status === "adding" ? "Adding…" : "Save to watchlist"}</Button> : null}
      <Button type="button" size="sm" variant="ghost" asChild><a href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(block.company)}`} target="_blank" rel="noopener noreferrer">Find on LinkedIn <ArrowUpRight className="size-3.5" aria-hidden="true" /></a></Button>
    </div>
  );
}

function Comparison({ block }: { block: Extract<UiBlock, { type: "comparison" }> }) {
  const keys = useMemo(() => { const set = new Set<string>(); for (const account of block.accounts) for (const axis of account.axes ?? []) set.add(axis.key); return [...set]; }, [block.accounts]);
  return (
    <section className="space-y-3"><h3 className="text-sm font-semibold text-foreground">Account comparison</h3><div className="overflow-hidden rounded-lg border border-border/70"><Table><TableHeader><TableRow className="bg-muted/35 hover:bg-muted/35"><TableHead>Account</TableHead><TableHead>Score</TableHead>{keys.map((key) => <TableHead key={key} className="capitalize">{key}</TableHead>)}</TableRow></TableHeader><TableBody>{block.accounts.map((account) => <TableRow key={account.domain}><TableCell><span className="flex items-center gap-2"><CompanyMark domain={account.domain} name={account.company} size={18} /><span className="font-medium">{account.company}</span></span><span className="block pl-[26px] text-xs text-muted-foreground">{account.domain}</span></TableCell><TableCell><span className="flex items-center gap-2 font-semibold tabular-nums">{account.intent_score}<BandPill band={account.score_band} size="sm" /></span></TableCell>{keys.map((key) => { const axis = account.axes?.find((item) => item.key === key); return <TableCell key={key} className="tabular-nums">{axis ? `${axis.score} / ${axis.max}` : "Unavailable"}</TableCell>; })}</TableRow>)}</TableBody></Table></div></section>
  );
}

export function SuggestionChips({ suggestions, onPrompt, disabled }: { suggestions: UiSuggestion[]; onPrompt?: (prompt: string) => void; disabled?: boolean }) {
  if (!suggestions.length || !onPrompt) return null;
  return <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <Button key={suggestion.label} type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onPrompt(suggestion.prompt)}>{suggestion.label}</Button>)}</div>;
}

/** Hero → Why now → Recommended next move → evidence → everything else, regardless of block order. */
function orderBlocks(blocks: UiBlock[]): UiBlock[] {
  const rank = (block: UiBlock) => block.type === "intent_hero" ? 0 : block.type === "thesis" ? 1 : block.type === "signal_explorer" ? 2 : 3;
  return blocks.map((block, index) => ({ block, index })).sort((a, b) => rank(a.block) - rank(b.block) || a.index - b.index).map((item) => item.block);
}

export function GenUiWorkspace({ blocks, handlers, fresh = false, include }: { blocks: UiBlock[]; handlers: GenUiHandlers; fresh?: boolean; include?: UiBlock["type"][] }) {
  const hero = blocks.find((block): block is HeroBlock => block.type === "intent_hero");
  const company = hero?.company ?? blocks.find((block) => block.type === "action_rail")?.company;
  const sampleData = blocks.some((block) => block.type === "signal_explorer" && block.axes.some((axis) => isMockSource(axis.source)));
  const visibleBlocks = include ? blocks.filter((block) => include.includes(block.type)) : blocks;
  return (
    <div data-slot="score-artifact" className="score-artifact space-y-7">
      {orderBlocks(visibleBlocks).map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "intent_hero": return <IntentHero key={key} block={block} sampleData={sampleData} fresh={fresh} />;
          case "signal_explorer": return <EvidenceTable key={key} block={block} />;
          case "thesis": return <div key={key} className="space-y-5"><WhyNow block={block} /><NextMove block={block} company={company} onPrompt={handlers.onPrompt} /></div>;
          case "outreach_studio": return <OutreachStudio key={key} block={block} onPrompt={handlers.onPrompt} />;
          case "action_rail": return <ActionRail key={key} block={block} handlers={handlers} />;
          case "comparison": return <Comparison key={key} block={block} />;
          case "markdown": return <p key={key} className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">{block.text}</p>;
          default: return null;
        }
      })}
    </div>
  );
}
