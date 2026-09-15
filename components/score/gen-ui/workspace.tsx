"use client";

import { useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import type { SignalAxis, UiBlock, UiSuggestion } from "@/lib/gen-ui";
import { BandBadge, ScoreRing, avColor } from "@/components/score/score-result-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface GenUiHandlers {
  onWatchlist?: (company: string, domain: string) => void;
  watchlistByDomain?: Record<string, "adding" | "added">;
  onPrompt?: (prompt: string) => void;
}

const AXIS_BAR: Record<string, string> = {
  funding: "bg-foreground/70",
  hiring: "bg-[color:var(--hot)]",
  news: "bg-[color:var(--warm)]",
  technology: "bg-foreground/50",
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

function IntentHero({ block }: { block: Extract<UiBlock, { type: "intent_hero" }> }) {
  const signalDate = formatSignalDate(block.latest_signal_at);
  const coldFinding = block.score_band === "COLD";

  return (
    <Card className="@container/card gap-4 rounded-xl py-4 shadow-xs">
      <CardHeader className="border-b px-4 pb-4 [.border-b]:pb-4">
        <CardDescription>Intent score</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          <span
            className="flex size-8 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
            style={{ background: avColor(block.company) }}
            aria-hidden
          >
            {block.company[0]}
          </span>
          {block.company}
        </CardTitle>
        <CardAction>
          <BandBadge band={block.score_band} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center">
        <ScoreRing score={block.intent_score} band={block.score_band} signalDate={signalDate} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {block.intent_score}
            </span>
            <span className="text-sm text-muted-foreground">/ 100 intent</span>
            {signalDate ? (
              <span className="text-sm tabular-nums text-foreground">Signals as of {signalDate}</span>
            ) : (
              <span className="text-sm text-muted-foreground">No dated signals</span>
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
              <Badge variant="outline" className="rounded-md font-normal">{block.buying_stage}</Badge>
            ) : null}
            {block.urgency ? (
              <Badge variant="outline" className="rounded-md font-normal">Urgency {block.urgency}</Badge>
            ) : null}
            {block.data_coverage != null ? (
              <span className="tabular-nums">
                Coverage {Math.round(block.data_coverage * 100)}%
                {block.score_status ? ` (${block.score_status})` : ""}
              </span>
            ) : null}
            {block.icp_fit_score !== undefined ? (
              <span className="tabular-nums">
                {block.icp_fit_score == null ? "ICP fit unavailable" : `ICP fit ${block.icp_fit_score}%`}
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
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
          "flex w-full flex-col gap-2 rounded-xl border bg-muted/50 p-4 text-left transition-[border-color,background,box-shadow]",
          "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
          isOn ? "border-foreground/30 bg-card shadow-xs" : "border-transparent",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {axis.label}
          </span>
          {isOn ? (
            <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
              Selected
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {axis.score}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">/{axis.max}</span>
        </div>
        <div className="min-h-[14px] text-[11px] tabular-nums text-muted-foreground">
          {observed ?? (axis.context ? "Context" : "No date")}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full rounded-full transition-[width]", AXIS_BAR[axis.key] ?? "bg-muted-foreground")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
    );
  }

  return (
    <Card className="gap-4 rounded-xl py-4 shadow-xs">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Signal explorer</CardTitle>
        <CardDescription>Click an axis for evidence</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="grid grid-cols-2 gap-3 @2xl/main:grid-cols-4">
          {triggers.map((axis) => (
            <AxisCard key={axis.key} axis={axis} />
          ))}
        </div>
        {context.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">
              Account context
              <span className="ml-2 font-normal text-muted-foreground">· excluded from score</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {context.map((axis) => (
                <AxisCard key={axis.key} axis={axis} />
              ))}
            </div>
          </div>
        ) : null}
        {active ? (
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {active.label} evidence
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {active.detail || "No detail available for this axis."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs tabular-nums text-muted-foreground">
              {active.source ? <span>Source: {active.source}</span> : null}
              {active.observed_at ? <span>Observed {formatSignalDate(active.observed_at)}</span> : null}
              <span>
                {active.score}/{active.max}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Thesis({ block }: { block: Extract<UiBlock, { type: "thesis" }> }) {
  return (
    <Card className="gap-3 rounded-xl py-4 shadow-xs">
      <CardHeader className="px-4">
        <CardTitle className="text-base">AI thesis</CardTitle>
        <CardDescription>Why this score, and what to do next</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <p className="text-sm leading-relaxed text-foreground">{block.summary}</p>
        {(block.recommended_action || block.why_now) && (
          <div className="rounded-xl border border-l-4 border-l-foreground/30 bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI verdict</p>
            {block.recommended_action ? (
              <p className="mt-1 text-sm font-medium text-foreground">{block.recommended_action}</p>
            ) : null}
            {block.why_now ? (
              <p className="mt-1 text-sm text-muted-foreground">{block.why_now}</p>
            ) : null}
          </div>
        )}
        {block.urgency ? (
          <p className="text-xs text-muted-foreground">Urgency: {block.urgency}</p>
        ) : null}
      </CardContent>
    </Card>
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
    <Card className="gap-4 rounded-xl py-4 shadow-xs">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Outreach studio</CardTitle>
        <CardDescription>Edit, copy, or refine in chat</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Subject</span>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Talk track</span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="rounded-lg"
          />
        </label>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t px-4 pt-4">
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={copy} disabled={!subject && !body}>
          {copied ? "Copied" : "Copy"}
        </Button>
        {onPrompt ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => onPrompt("Rewrite this outreach to be shorter and more specific to the strongest trigger.")}
          >
            Refine in chat
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function ActionRail({
  block,
  handlers,
}: {
  block: Extract<UiBlock, { type: "action_rail" }>;
  handlers: GenUiHandlers;
}) {
  return (
    <Card className="gap-0 rounded-xl py-4 shadow-xs">
      <CardFooter className="flex flex-wrap gap-2 px-4">
        {handlers.onWatchlist ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => handlers.onWatchlist?.(block.company, block.domain)}
            disabled={
              handlers.watchlistByDomain?.[block.domain] === "adding" ||
              handlers.watchlistByDomain?.[block.domain] === "added"
            }
          >
            {handlers.watchlistByDomain?.[block.domain] === "added"
              ? "Watching"
              : handlers.watchlistByDomain?.[block.domain] === "adding"
                ? "Adding…"
                : "Save to list"}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
          <a
            href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(block.company)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open account
          </a>
        </Button>
      </CardFooter>
    </Card>
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
    <Card className="gap-4 rounded-xl py-4 shadow-xs">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Comparison</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto px-4">
        <div
          className="grid min-w-[480px] gap-3 text-sm"
          style={{ gridTemplateColumns: `120px repeat(${block.accounts.length}, 1fr)` }}
        >
          <div />
          {block.accounts.map((account) => (
            <div key={account.domain} className="rounded-xl bg-muted/50 p-3">
              <BandBadge band={account.score_band} className="mb-2" />
              <p className="font-medium text-foreground">{account.company}</p>
              <p className="text-lg font-semibold tabular-nums">{account.intent_score}</p>
            </div>
          ))}
          {keys.map((key) => (
            <div key={key} className="contents">
              <span className="flex items-center text-muted-foreground capitalize">{key}</span>
              {block.accounts.map((account) => {
                const axis = account.axes?.find((a) => a.key === key);
                return (
                  <span key={account.domain} className="flex items-center tabular-nums">
                    {axis ? `${axis.score}/${axis.max}` : "—"}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
          className="rounded-lg"
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
    <div className="flex flex-col gap-4">
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
              <div key={`${block.type}-${i}`} className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">
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
