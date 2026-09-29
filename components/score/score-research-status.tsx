import { Check, Loader2, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScoreProgressEvent } from "@/lib/score-progress";
import { isMockSource, sourceLabel, stripMockMarker } from "@/lib/source-labels";
import { daysSince, formatAbsoluteDate, formatDaysAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

type SignalDone = Extract<ScoreProgressEvent, { type: "signal_done" }>;

/** Real progress reported by the score stream. Rows only change when a provider actually lands. */
export interface ScoreResearchProgress {
  signals: Record<string, Omit<SignalDone, "type" | "key">>;
  reasoning: "idle" | "running" | "done";
}

export const EMPTY_RESEARCH_PROGRESS: ScoreResearchProgress = { signals: {}, reasoning: "idle" };

export function applyResearchEvent(progress: ScoreResearchProgress, event: ScoreProgressEvent): ScoreResearchProgress {
  if (event.type === "signal_done") {
    const { type: _type, key, ...rest } = event;
    void _type;
    return { ...progress, signals: { ...progress.signals, [key]: rest } };
  }
  if (event.type === "reasoning_start") return { ...progress, reasoning: "running" };
  return { ...progress, reasoning: "done" };
}

const TRIGGER_ROWS = [["funding", "Funding"], ["hiring", "Hiring"], ["news", "News"], ["technology", "Tech"]] as const;
const CONTEXT_ROWS = [["web", "Web authority"], ["github", "GitHub activity"]] as const;

function statusView(status: SignalDone["status"]) {
  if (status === "ok") return { icon: Check, label: "found", tone: "text-foreground" };
  if (status === "stale") return { icon: Check, label: "older evidence", tone: "text-foreground" };
  if (status === "no_signal") return { icon: Minus, label: "none found", tone: "text-muted-foreground" };
  return { icon: Minus, label: "unavailable", tone: "text-muted-foreground" };
}

function LandedRow({ label, signal }: { label: string; signal: ScoreResearchProgress["signals"][string] }) {
  const view = statusView(signal.status);
  const Icon = view.icon;
  const found = signal.status === "ok" || signal.status === "stale";
  const detail = signal.detail ? stripMockMarker(signal.detail) : "";
  const age = found ? formatDaysAgo(daysSince(signal.observed_at)) : null;
  const source = isMockSource(signal.source) ? null : sourceLabel(signal.source);
  const meta = [age, source].filter(Boolean).join(" · ");
  return (
    <li data-state="landed" className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border/60 px-3 py-3 last:border-0 sm:grid-cols-[7rem_7.5rem_minmax(0,1fr)] sm:py-3.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={cn("score-research-land inline-flex items-center gap-1.5 text-xs font-medium", view.tone)}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />{view.label}
      </span>
      <div className="score-research-land col-span-2 min-w-0 sm:col-span-1">
        {detail && found ? <p className="truncate text-sm text-foreground/85" title={detail}>{detail}</p> : null}
        {meta ? <p className="text-xs text-muted-foreground" title={formatAbsoluteDate(signal.observed_at) ?? undefined}>{meta}</p> : null}
        {!found && !meta ? <p className="text-xs text-muted-foreground">No qualifying evidence right now</p> : null}
      </div>
    </li>
  );
}

function PendingRow({ label }: { label: string }) {
  return (
    <li data-state="checking" className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-border/60 px-3 py-3 last:border-0 sm:grid-cols-[7rem_7.5rem_minmax(0,1fr)] sm:py-3.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />checking…
      </span>
      <div className="col-span-2 flex items-center sm:col-span-1"><Skeleton className="h-3 w-full max-w-72" /></div>
    </li>
  );
}

export function ScoreResearchStatus({ mode = "score", progress }: { mode?: "score" | "chat"; progress?: ScoreResearchProgress }) {
  const signals = progress?.signals ?? {};
  const landed = TRIGGER_ROWS.filter(([key]) => signals[key]).length;
  const synthesising = progress?.reasoning === "running" || progress?.reasoning === "done";
  const headline = mode === "chat"
    ? "Preparing a grounded response…"
    : synthesising ? "Synthesising why-now…" : "Verifying current signals and source dates…";
  const contextLanded = CONTEXT_ROWS.filter(([key]) => signals[key]);

  return (
    <div className="score-research">
      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="score-research-dot size-1.5 rounded-full bg-foreground/70" aria-hidden="true" />
        <span>{headline}</span>
        {mode === "score" && progress && !synthesising ? <span className="tabular-nums text-xs">{landed} of {TRIGGER_ROWS.length} checked</span> : null}
      </p>
      {mode === "score" ? (
        <>
          <ul className="mt-5 overflow-hidden rounded-lg border border-border/70" aria-label="Signal sources">
            {TRIGGER_ROWS.map(([key, label]) => signals[key] ? <LandedRow key={key} label={label} signal={signals[key]} /> : <PendingRow key={key} label={label} />)}
          </ul>
          {contextLanded.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Context checked: {contextLanded.map(([, label]) => label).join(" · ")}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
