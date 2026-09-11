"use client";

import { useId } from "react";
import type { ScoreBand, SignalSet } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ScoreCardData = {
  company: string;
  domain: string;
  intent_score: number;
  score_band: ScoreBand;
  ai_summary?: string;
  recommended_action?: string;
  buying_stage?: string;
  urgency?: string;
  why_now?: string;
  data_coverage?: number;
  score_status?: string;
  icp_fit_score?: number | null;
  confidence?: number;
  email_subject?: string;
  talk_track?: string;
  signals?: SignalSet;
};

/** Neutral / band-tinted avatars — no lime signature wash. */
const AV_COLORS = [
  "linear-gradient(135deg,#3a3f44,#1c1f22)",
  "linear-gradient(135deg,#4ade80,#166534)",
  "linear-gradient(135deg,#f5b544,#7c5a1a)",
  "linear-gradient(135deg,#8a8f98,#3f434a)",
  "linear-gradient(135deg,#64748b,#1e293b)",
  "linear-gradient(135deg,#4ade80,#8a8f98)",
  "linear-gradient(135deg,#f5b544,#8a8f98)",
  "linear-gradient(135deg,#6b7280,#111827)",
];

export function avColor(name: string): string {
  return AV_COLORS[(name.charCodeAt(0) ?? 0) % AV_COLORS.length];
}

export function bandClass(band: string | null): string {
  if (band === "HOT") return "band-hot";
  if (band === "WARM") return "band-warm";
  return "band-cold";
}

export function bandTone(band: string | null): "hot" | "warm" | "cold" {
  if (band === "HOT") return "hot";
  if (band === "WARM") return "warm";
  return "cold";
}

/** Band chip: hue + second channel (shape on the mark). */
export function BandBadge({ band, className }: { band: string; className?: string }) {
  const tone = bandTone(band);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]",
        tone === "hot" && "border-[color:var(--hot-border)] bg-[color:var(--hot-bg)] text-[color:var(--hot)]",
        tone === "warm" && "border-[color:var(--warm-border)] bg-[color:var(--warm-bg)] text-[color:var(--warm)]",
        tone === "cold" && "border-[color:var(--cold-border)] bg-[color:var(--cold-bg)] text-[color:var(--cold)]",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0",
          tone === "hot" && "rounded-full bg-[color:var(--hot)]",
          tone === "warm" && "rotate-45 rounded-[1px] bg-[color:var(--warm)]",
          tone === "cold" && "rounded-none bg-[color:var(--cold)]",
        )}
        aria-hidden
      />
      {band}
    </span>
  );
}

function ringStops(band: string): [string, string] {
  if (band === "HOT") return ["var(--hot)", "#22c55e"];
  if (band === "WARM") return ["var(--warm)", "#d49530"];
  return ["var(--cold)", "var(--text-tertiary)"];
}

export function ScoreRing({
  score,
  band,
  signalDate,
}: {
  score: number;
  band: string;
  signalDate?: string | null;
}) {
  const gradId = useId().replace(/:/g, "");
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, score)) / 100);
  const [c0, c1] = ringStops(band);

  return (
    <div className="relative size-[148px] shrink-0 sm:size-[168px]">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={c0} />
            <stop offset="100%" stopColor={c1} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} stroke="var(--border)" strokeWidth="6" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
        <BandBadge band={band} />
        <div className="quantity text-[44px] font-semibold leading-none tracking-tight text-foreground sm:text-[52px]">
          {score}
        </div>
        <div className="text-[11px] tracking-wide text-muted-foreground">/ 100</div>
        {signalDate ? (
          <div className="quantity mt-0.5 text-[11px] font-medium text-foreground/80">{signalDate}</div>
        ) : null}
      </div>
    </div>
  );
}

function ResultHead({
  result,
  onWatchlist,
  watchlistAdded,
  watchlistAdding,
}: {
  result: ScoreCardData;
  onWatchlist?: () => void;
  watchlistAdded?: boolean;
  watchlistAdding?: boolean;
}) {
  const signalDate = result.signals?.latestSignalDate
    ? result.signals.latestSignalDate.slice(0, 10)
    : null;

  return (
    <div className="mb-5 flex flex-wrap items-start gap-3">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
        style={{ background: avColor(result.company) }}
      >
        {result.company[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <BandBadge band={result.score_band} />
          <span className="truncate text-lg font-semibold text-foreground">{result.company}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{result.domain}</span>
          {signalDate ? <span className="quantity text-foreground">Signals {signalDate}</span> : null}
          {result.buying_stage ? <span>{result.buying_stage}</span> : null}
          {result.urgency ? <span>Urgency {result.urgency}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onWatchlist ? (
          <button
            type="button"
            className="tb-btn outlined"
            onClick={onWatchlist}
            disabled={watchlistAdding || watchlistAdded}
          >
            {watchlistAdded ? "Watching ✓" : watchlistAdding ? "Adding…" : "Save to list"}
          </button>
        ) : null}
        <a
          className="tb-btn outlined"
          href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(result.company)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open account →
        </a>
      </div>
    </div>
  );
}

function OverviewBlock({ result }: { result: ScoreCardData }) {
  const signalDate = result.signals?.latestSignalDate
    ? result.signals.latestSignalDate.slice(0, 10)
    : null;
  if (!result.ai_summary) {
    return <ScoreRing score={result.intent_score} band={result.score_band} signalDate={signalDate} />;
  }
  return (
    <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center">
      <ScoreRing score={result.intent_score} band={result.score_band} signalDate={signalDate} />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">AI thesis</p>
        <p className="text-[15px] leading-relaxed text-foreground">{result.ai_summary}</p>
      </div>
    </div>
  );
}

const SIGNAL_CONFIG = [
  { key: "funding" as const, label: "Funding" },
  { key: "hiring" as const, label: "Hiring" },
  { key: "news" as const, label: "News" },
  { key: "technology" as const, label: "Tech" },
];

const CONTEXT_CONFIG = [
  { key: "web" as const, label: "Web authority" },
  { key: "github" as const, label: "GitHub activity" },
];

function SignalGrid({ signals }: { signals: SignalSet }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] font-medium text-foreground">Signal axes</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SIGNAL_CONFIG.map(({ key, label }) => {
          const sig = signals[key];
          const pct = sig ? Math.round((sig.score / sig.max) * 100) : 0;
          const date = sig?.observed_at?.slice(0, 10);
          return (
            <div key={key} className="rounded-lg border border-border bg-card/60 p-3.5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {label}
              </div>
              <div className="quantity text-[26px] font-semibold leading-none">{sig?.score ?? "—"}</div>
              <div className="quantity mt-1 text-[11px] text-muted-foreground">
                /{sig?.max ?? 100}
                {date ? ` · ${date}` : ""}
              </div>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-foreground/50" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="pt-2 text-[13px] font-medium text-foreground">Account context</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CONTEXT_CONFIG.map(({ key, label }) => {
          const signal = signals[key];
          if (!signal) return null;
          return (
            <div key={key} className="rounded-lg border border-border bg-card/60 p-3.5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {label}
              </div>
              <div className="quantity text-[26px] font-semibold leading-none">{signal.score}</div>
              <div className="quantity mt-1 text-[11px] text-muted-foreground">/{signal.max} · context</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompetitiveAnalysis({
  result,
  onCopyEmail,
  emailCopied,
}: {
  result: ScoreCardData;
  onCopyEmail?: () => void;
  emailCopied?: boolean;
}) {
  if (!result.recommended_action && !result.why_now) return null;

  return (
    <div
      role="status"
      className="mt-6 flex flex-col gap-3 rounded-lg border border-border border-l-[3px] border-l-foreground bg-card/80 px-4 py-3.5 sm:flex-row sm:items-start"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Verdict</p>
        {result.recommended_action ? (
          <p className="text-[15px] font-medium leading-snug text-foreground">{result.recommended_action}</p>
        ) : null}
        {result.why_now ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{result.why_now}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onCopyEmail ? (
          <button
            type="button"
            className="tb-btn outlined"
            onClick={onCopyEmail}
            disabled={!result.email_subject && !result.talk_track}
          >
            {emailCopied ? "Copied!" : "Copy email + talk track"}
          </button>
        ) : null}
        <a
          className="tb-btn outlined"
          href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(result.company)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Draft outreach →
        </a>
      </div>
    </div>
  );
}

export function scoreFromToolResult(name: string, result: unknown): ScoreCardData | null {
  if ((name !== "score_company" && name !== "get_company_details") || !result || typeof result !== "object") {
    return null;
  }
  const row = result as Record<string, unknown>;
  if (typeof row.error === "string") return null;
  const intent =
    typeof row.intent_score === "number" ? row.intent_score
    : typeof row.score === "number" ? row.score
    : null;
  const band = row.score_band;
  const company = typeof row.company === "string" ? row.company : null;
  const domain = typeof row.domain === "string" ? row.domain : null;
  if (intent == null || (band !== "HOT" && band !== "WARM" && band !== "COLD") || !company || !domain) {
    return null;
  }
  return {
    company,
    domain,
    intent_score: intent,
    score_band: band,
    ai_summary: typeof row.ai_summary === "string" ? row.ai_summary : undefined,
    recommended_action: typeof row.recommended_action === "string" ? row.recommended_action : undefined,
    buying_stage: typeof row.buying_stage === "string" ? row.buying_stage : undefined,
    urgency: typeof row.urgency === "string" ? row.urgency : undefined,
    why_now: typeof row.why_now === "string" ? row.why_now : undefined,
    email_subject: typeof row.email_subject === "string" ? row.email_subject : undefined,
    talk_track: typeof row.talk_track === "string" ? row.talk_track : undefined,
    signals: row.signals && typeof row.signals === "object" ? row.signals as SignalSet : undefined,
  };
}

export function ScoreResultCard({
  result,
  onWatchlist,
  watchlistAdded,
  watchlistAdding,
  onCopyEmail,
  emailCopied,
}: {
  result: ScoreCardData;
  onWatchlist?: () => void;
  watchlistAdded?: boolean;
  watchlistAdding?: boolean;
  onCopyEmail?: () => void;
  emailCopied?: boolean;
}) {
  return (
    <div className="score-result-card space-y-2">
      <ResultHead
        result={result}
        onWatchlist={onWatchlist}
        watchlistAdded={watchlistAdded}
        watchlistAdding={watchlistAdding}
      />
      <OverviewBlock result={result} />
      {result.signals ? <SignalGrid signals={result.signals} /> : null}
      <CompetitiveAnalysis result={result} onCopyEmail={onCopyEmail} emailCopied={emailCopied} />
    </div>
  );
}
