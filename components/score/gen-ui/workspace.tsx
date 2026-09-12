"use client";

import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import type { UiBlock, UiSuggestion, SignalAxis } from "@/lib/gen-ui";
import { BandBadge, ScoreRing, avColor, bandTone } from "@/components/score/score-result-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface GenUiHandlers {
  onWatchlist?: (company: string, domain: string) => void;
  watchlistByDomain?: Record<string, "adding" | "added">;
  onPrompt?: (prompt: string) => void;
}

/** Quiet axis accent — hue only on the bar, not neon swatches. */
const AXIS_BAR: Record<string, string> = {
  funding: "bg-[color:var(--text-secondary)]",
  hiring: "bg-[color:var(--hot)]",
  news: "bg-[color:var(--warm)]",
  technology: "bg-[color:var(--text-primary)]",
  web: "bg-[color:var(--cold)]",
  github: "bg-[color:var(--cold)]",
};

function formatSignalDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso.slice(0, 10);
    return format(d, "MMM d, yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

function SectionLabel({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3 text-[13px] text-muted-foreground">
      <strong className="font-medium text-foreground">{title}</strong>
      {hint ? <span className="text-muted-foreground/80">· {hint}</span> : null}
      <Separator className="flex-1" />
    </div>
  );
}

function IntentHero({ block }: { block: Extract<UiBlock, { type: "intent_hero" }> }) {
  const signalDate = formatSignalDate(block.latest_signal_at);
  const tone = bandTone(block.score_band);
  const coldFinding = block.score_band === "COLD";

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <ScoreRing
        score={block.intent_score}
        band={block.score_band}
        signalDate={signalDate}
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
            style={{ background: avColor(block.company) }}
            aria-hidden
          >
            {block.company[0]}
          </span>
          <BandBadge band={block.score_band} />
          <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {block.company}
          </h2>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="quantity text-[28px] font-semibold leading-none tracking-tight text-foreground">
            {block.intent_score}
          </span>
          <span className="text-muted-foreground">/ 100 intent</span>
          {signalDate ? (
            <>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span className="quantity text-foreground">
                Signals as of {signalDate}
              </span>
            </>
          ) : (
            <>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span>No dated signals</span>
            </>
          )}
        </div>

        {coldFinding ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Finding — limited purchase-intent evidence. Treat as a research answer, not a scoring failure.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{block.domain}</span>
          {block.buying_stage ? (
            <Badge variant="outline" className="rounded-md font-normal">
              {block.buying_stage}
            </Badge>
          ) : null}
          {block.urgency ? (
            <Badge variant="outline" className="rounded-md font-normal">
              Urgency {block.urgency}
            </Badge>
          ) : null}
          {block.data_coverage != null ? (
            <span className="quantity">
              Coverage {Math.round(block.data_coverage * 100)}%
              {block.score_status ? ` (${block.score_status})` : ""}
            </span>
          ) : null}
          {block.icp_fit_score !== undefined ? (
            <span className="quantity">
              {block.icp_fit_score == null ? "ICP fit unavailable" : `ICP fit ${block.icp_fit_score}%`}
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "h-px w-full max-w-md",
            tone === "hot" && "bg-[color:var(--hot-border)]",
            tone === "warm" && "bg-[color:var(--warm-border)]",
            tone === "cold" && "bg-border",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}

function SignalExplorer({ block }: { block: Extract<UiBlock, { type: "signal_explorer" }> }) {
  const triggers = block.axes.filter((a) => !a.context);
  const context = block.axes.filter((a) => a.context);
  const [selected, setSelected] = useState<string>(
    block.selected_key ?? triggers[0]?.key ?? block.axes[0]?.key,
  );
  const active = block.axes.find((a) => a.key === selected) ?? block.axes[0];

  function AxisCard({ axis }: { axis: SignalAxis }) {
    const pct = Math.round((axis.score / axis.max) * 100);
    const isOn = axis.key === selected;
    const observed = formatSignalDate(axis.observed_at);

    return (
      <button
        type="button"
        onClick={() => setSelected(axis.key)}
        aria-pressed={isOn}
        className={cn(
          "flex w-full flex-col gap-2 rounded-lg border bg-card/60 p-3.5 text-left transition-[border-color,background,box-shadow]",
          "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
          isOn
            ? "border-foreground/35 bg-accent shadow-[var(--elevate-2)]"
            : "border-border",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {axis.label}
          </span>
          {isOn ? (
            <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
              Selected
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="quantity text-[26px] font-semibold leading-none tracking-tight text-foreground">
            {axis.score}
          </span>
          <span className="quantity text-[11px] text-muted-foreground">/{axis.max}</span>
        </div>
        <div className="quantity min-h-[14px] text-[11px] text-muted-foreground">
          {observed ?? (axis.context ? "Context" : "No date")}
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full transition-[width]", AXIS_BAR[axis.key] ?? "bg-muted-foreground")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
    );
  }

  return (
    <div className="w-full space-y-4">
      <SectionLabel title="Signal explorer" hint="select an axis for evidence" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {triggers.map((axis) => (
          <AxisCard key={axis.key} axis={axis} />
        ))}
      </div>
      {context.length > 0 ? (
        <div className="space-y-3 pt-1">
          <SectionLabel title="Account context" hint="excluded from score" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {context.map((axis) => (
              <AxisCard key={axis.key} axis={axis} />
            ))}
          </div>
        </div>
      ) : null}
      {active ? (
        <div className="rounded-lg border border-border bg-card/70 p-4 shadow-[var(--elevate-1)] sm:p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {active.label} evidence
            </p>
            <div className="quantity flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {formatSignalDate(active.observed_at) ? (
                <span className="text-foreground">
                  Observed {formatSignalDate(active.observed_at)}
                </span>
              ) : null}
              <span>
                {active.score}/{active.max}
              </span>
              {active.source ? <span>Source {active.source}</span> : null}
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {active.detail || "No detail available for this axis."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function VerdictCallout({
  action,
  whyNow,
  urgency,
}: {
  action?: string;
  whyNow?: string;
  urgency?: string;
}) {
  if (!action && !whyNow) return null;
  return (
    <div
      role="status"
      className="mt-4 flex gap-3 rounded-lg border border-border border-l-[3px] border-l-foreground bg-card/80 px-4 py-3.5 shadow-[var(--elevate-1)]"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Verdict
        </p>
        {action ? (
          <p className="text-[15px] font-medium leading-snug text-foreground">{action}</p>
        ) : null}
        {whyNow ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{whyNow}</p>
        ) : null}
        {urgency ? (
          <p className="text-xs text-muted-foreground">
            Urgency <span className="text-foreground">{urgency}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Thesis({ block }: { block: Extract<UiBlock, { type: "thesis" }> }) {
  return (
    <div className="space-y-3">
      <SectionLabel title="AI thesis" />
      <div className="rounded-lg border border-border bg-transparent px-1 py-1 sm:px-0">
        <p className="max-w-prose text-[15px] leading-[1.6] tracking-[-0.011em] text-foreground">
          {block.summary}
        </p>
      </div>
      <VerdictCallout
        action={block.recommended_action}
        whyNow={block.why_now}
        urgency={block.urgency}
      />
    </div>
  );
}

function OutreachStudio({
  block,
  onPrompt,
}: {
  block: Extract<UiBlock, { type: "outreach_studio" }>;
  onPrompt?: (prompt: string) => void;
}) {
  const [subject, setSubject] = useState(block.subject ?? "");
  const [body, setBody] = useState(block.talk_track ?? "");
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = [subject, body].filter(Boolean).join("\n\n");
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full space-y-3">
      <SectionLabel title="Outreach studio" hint="edit, copy, or refine in chat" />
      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        Subject
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        Talk track
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="min-h-[120px] resize-y"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!subject && !body}>
          {copied ? "Copied" : "Copy"}
        </Button>
        {onPrompt ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onPrompt("Rewrite this outreach to be shorter and more specific to the strongest trigger.")
            }
          >
            Refine in chat
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ActionRail({
  block,
  handlers,
}: {
  block: Extract<UiBlock, { type: "action_rail" }>;
  handlers: GenUiHandlers;
}) {
  const watchState = handlers.watchlistByDomain?.[block.domain];
  return (
    <div className="flex flex-wrap gap-2">
      {handlers.onWatchlist ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handlers.onWatchlist?.(block.company, block.domain)}
          disabled={watchState === "adding" || watchState === "added"}
        >
          {watchState === "added" ? "Watching" : watchState === "adding" ? "Adding…" : "Save to list"}
        </Button>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <a
          href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(block.company)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open account
        </a>
      </Button>
    </div>
  );
}

function Comparison({ block }: { block: Extract<UiBlock, { type: "comparison" }> }) {
  const keys = useMemo(() => {
    const set = new Set<string>();
    for (const account of block.accounts) {
      for (const axis of account.axes ?? []) set.add(axis.key);
    }
    return [...set];
  }, [block.accounts]);

  return (
    <div className="w-full space-y-3 overflow-x-auto">
      <SectionLabel title="Comparison" />
      <div
        className="grid gap-2 text-sm"
        style={{ gridTemplateColumns: `120px repeat(${block.accounts.length}, minmax(100px, 1fr))` }}
      >
        <div />
        {block.accounts.map((account) => (
          <div key={account.domain} className="space-y-1">
            <BandBadge band={account.score_band} />
            <strong className="block truncate text-foreground">{account.company}</strong>
            <span className="quantity text-lg font-semibold">{account.intent_score}</span>
          </div>
        ))}
        {keys.map((key) => (
          <div key={key} className="contents">
            <span className="text-muted-foreground capitalize">{key}</span>
            {block.accounts.map((account) => {
              const axis = account.axes?.find((a) => a.key === key);
              return (
                <span key={account.domain} className="quantity">
                  {axis ? `${axis.score}/${axis.max}` : "—"}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SuggestionChips({
  suggestions,
  onPrompt,
  disabled,
}: {
  suggestions: UiSuggestion[];
  onPrompt?: (prompt: string) => void;
  disabled?: boolean;
}) {
  if (!suggestions.length || !onPrompt) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => (
        <Button
          key={s.label}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title={s.prompt}
          onClick={() => onPrompt(s.prompt)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}

export function GenUiWorkspace({ blocks, handlers }: { blocks: UiBlock[]; handlers: GenUiHandlers }) {
  return (
    <div className="flex w-full flex-col gap-7">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "intent_hero":
            return <IntentHero key={`${block.type}-${i}`} block={block} />;
          case "signal_explorer":
            return <SignalExplorer key={`${block.type}-${i}`} block={block} />;
          case "thesis":
            return <Thesis key={`${block.type}-${i}`} block={block} />;
          case "outreach_studio":
            return <OutreachStudio key={`${block.type}-${i}`} block={block} onPrompt={handlers.onPrompt} />;
          case "action_rail":
            return <ActionRail key={`${block.type}-${i}`} block={block} handlers={handlers} />;
          case "comparison":
            return <Comparison key={`${block.type}-${i}`} block={block} />;
          case "markdown":
            return (
              <div key={`${block.type}-${i}`} className="chat-md text-sm leading-relaxed text-foreground/90">
                {block.text}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
