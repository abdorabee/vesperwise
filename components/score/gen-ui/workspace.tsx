"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, ListPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SignalAxis, UiBlock, UiSuggestion } from "@/lib/gen-ui";
import { cn } from "@/lib/utils";

export interface GenUiHandlers {
  onWatchlist?: (company: string, domain: string) => void;
  watchlistByDomain?: Record<string, "adding" | "added">;
  onPrompt?: (prompt: string) => void;
}

function IntentHeading({ block }: { block: Extract<UiBlock, { type: "intent_hero" }> }) {
  const coverage = block.data_coverage == null ? "Coverage unavailable" : `${Math.round(block.data_coverage * 100)}% coverage`;
  return (
    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/70 pb-5">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-semibold tracking-[-0.035em] text-foreground">{block.company}</h2>
        <p className="mt-1 truncate text-sm text-muted-foreground">{block.domain}</p>
      </div>
      <span className="text-4xl font-semibold tracking-[-0.06em] tabular-nums text-foreground">{block.intent_score}</span>
      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-semibold">{block.score_band}</Badge>
      <span className="basis-full text-right text-xs text-muted-foreground">{coverage}</span>
    </header>
  );
}

function isUnavailable(axis: SignalAxis) {
  return !axis.detail || axis.detail.trim().toLowerCase() === "unavailable";
}

function SignalRows({ axes }: { axes: SignalAxis[] }) {
  return (
    <TableBody>
      {axes.map((axis) => {
        const unavailable = isUnavailable(axis);
        const evidence = unavailable ? "Unavailable" : [axis.observed_at?.slice(0, 10), axis.source].filter(Boolean).join(" · ") || "Source date unavailable";
        return (
          <TableRow key={axis.key} data-slot="score-signal-row" className="score-artifact-row align-top hover:bg-transparent">
            <TableCell className="w-32 font-medium text-foreground">{axis.label}</TableCell>
            <TableCell className="w-28 whitespace-nowrap font-medium tabular-nums text-foreground">{unavailable ? "Unavailable" : `${axis.score} / ${axis.max}`}</TableCell>
            <TableCell className="min-w-64">
              <p className={cn("leading-5", unavailable ? "text-muted-foreground" : "text-foreground/85")}>{unavailable ? "No current evidence available." : axis.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">{evidence}</p>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}

function SignalTable({ block }: { block: Extract<UiBlock, { type: "signal_explorer" }> }) {
  const triggers = block.axes.filter((axis) => !axis.context);
  const context = block.axes.filter((axis) => axis.context);
  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-lg border border-border/70">
        <Table>
          <TableHeader><TableRow className="bg-muted/35 hover:bg-muted/35"><TableHead>Signal</TableHead><TableHead>Current read</TableHead><TableHead>Dated evidence</TableHead></TableRow></TableHeader>
          <SignalRows axes={triggers} />
        </Table>
      </div>
      {context.length > 0 ? (
        <section aria-labelledby="supporting-context-title" className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2"><h3 id="supporting-context-title" className="text-sm font-semibold text-foreground">Supporting context</h3><span className="text-xs text-muted-foreground">excluded from score</span></div>
          <div className="overflow-hidden rounded-lg border border-border/70">
            <Table>
              <TableHeader><TableRow className="bg-muted/35 hover:bg-muted/35"><TableHead>Source</TableHead><TableHead>Current read</TableHead><TableHead>Context</TableHead></TableRow></TableHeader>
              <SignalRows axes={context} />
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Thesis({ block }: { block: Extract<UiBlock, { type: "thesis" }> }) {
  return (
    <section className="score-artifact-copy space-y-5">
      <div><h3 className="text-sm font-semibold text-foreground">Why now</h3><p className="mt-2 text-sm leading-6 text-foreground/85">{block.why_now || block.summary}</p></div>
      {block.why_now && block.summary !== block.why_now ? <p className="text-sm leading-6 text-muted-foreground">{block.summary}</p> : null}
      {block.recommended_action ? <div className="score-artifact-action border-l-2 border-primary pl-4"><p className="text-xs font-medium text-muted-foreground">Recommended next move</p><p className="mt-1 text-sm font-medium leading-6 text-foreground">{block.recommended_action}</p></div> : null}
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
      <Button type="button" size="sm" variant="ghost" asChild><a href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(block.company)}`} target="_blank" rel="noopener noreferrer">Open account <ExternalLink className="size-3.5" /></a></Button>
    </div>
  );
}

function Comparison({ block }: { block: Extract<UiBlock, { type: "comparison" }> }) {
  const keys = useMemo(() => { const set = new Set<string>(); for (const account of block.accounts) for (const axis of account.axes ?? []) set.add(axis.key); return [...set]; }, [block.accounts]);
  return (
    <section className="space-y-3"><h3 className="text-sm font-semibold text-foreground">Account comparison</h3><div className="overflow-hidden rounded-lg border border-border/70"><Table><TableHeader><TableRow className="bg-muted/35 hover:bg-muted/35"><TableHead>Account</TableHead><TableHead>Score</TableHead>{keys.map((key) => <TableHead key={key} className="capitalize">{key}</TableHead>)}</TableRow></TableHeader><TableBody>{block.accounts.map((account) => <TableRow key={account.domain}><TableCell><span className="font-medium">{account.company}</span><span className="block text-xs text-muted-foreground">{account.domain}</span></TableCell><TableCell className="font-semibold tabular-nums">{account.intent_score} · {account.score_band}</TableCell>{keys.map((key) => { const axis = account.axes?.find((item) => item.key === key); return <TableCell key={key} className="tabular-nums">{axis ? `${axis.score} / ${axis.max}` : "Unavailable"}</TableCell>; })}</TableRow>)}</TableBody></Table></div></section>
  );
}

export function SuggestionChips({ suggestions, onPrompt, disabled }: { suggestions: UiSuggestion[]; onPrompt?: (prompt: string) => void; disabled?: boolean }) {
  if (!suggestions.length || !onPrompt) return null;
  return <div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <Button key={suggestion.label} type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onPrompt(suggestion.prompt)}>{suggestion.label}</Button>)}</div>;
}

export function GenUiWorkspace({ blocks, handlers }: { blocks: UiBlock[]; handlers: GenUiHandlers }) {
  return <div data-slot="score-artifact" className="score-artifact space-y-7">{blocks.map((block, index) => { switch (block.type) { case "intent_hero": return <IntentHeading key={`${block.type}-${index}`} block={block} />; case "signal_explorer": return <SignalTable key={`${block.type}-${index}`} block={block} />; case "thesis": return <Thesis key={`${block.type}-${index}`} block={block} />; case "outreach_studio": return <OutreachStudio key={`${block.type}-${index}`} block={block} onPrompt={handlers.onPrompt} />; case "action_rail": return <ActionRail key={`${block.type}-${index}`} block={block} handlers={handlers} />; case "comparison": return <Comparison key={`${block.type}-${index}`} block={block} />; case "markdown": return <p key={`${block.type}-${index}`} className="text-sm leading-6 text-foreground/85 whitespace-pre-wrap">{block.text}</p>; default: return null; } })}</div>;
}
