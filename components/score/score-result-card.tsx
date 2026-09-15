"use client";

import { useId } from "react";
import type { ScoreBand, SignalSet } from "@/lib/types";
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

const AV_COLORS = [
  "hsl(220 14% 46%)",
  "hsl(152 40% 36%)",
  "hsl(32 60% 42%)",
  "hsl(250 20% 48%)",
  "hsl(0 40% 48%)",
  "hsl(190 30% 40%)",
  "hsl(80 20% 38%)",
  "hsl(210 18% 42%)",
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

export function BandBadge({ band, className }: { band: ScoreBand | string; className?: string }) {
  const tone = bandTone(band);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md font-medium tabular-nums",
        tone === "hot" && "border-[color:var(--hot-border)] text-[color:var(--hot)]",
        tone === "warm" && "border-[color:var(--warm-border)] text-[color:var(--warm)]",
        tone === "cold" && "border-[color:var(--cold-border)] text-[color:var(--cold)]",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0",
          tone === "hot" && "rounded-full bg-[color:var(--hot)]",
          tone === "warm" && "rotate-45 rounded-[1px] bg-[color:var(--warm)]",
          tone === "cold" && "rounded-sm bg-[color:var(--cold)]",
        )}
        aria-hidden
      />
      {band}
    </Badge>
  );
}

function bandStroke(band: string): string {
  if (band === "HOT") return "var(--hot)";
  if (band === "WARM") return "var(--warm)";
  return "var(--cold)";
}

export function ScoreRing({
  score,
  band,
  signalDate,
  className,
}: {
  score: number;
  band: string;
  signalDate?: string | null;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const stroke = bandStroke(band);

  return (
    <div className={cn("relative size-[120px] shrink-0", className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.85" />
            <stop offset="100%" stopColor={stroke} />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{score}</span>
        <span className="text-[11px] text-muted-foreground">/ 100</span>
        {signalDate ? (
          <span className="mt-0.5 max-w-[96px] truncate text-center text-[10px] tabular-nums text-muted-foreground">
            {signalDate}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const SIGNAL_CONFIG = [
  { key: "funding" as const, label: "Funding", bar: "bg-foreground/70" },
  { key: "hiring" as const, label: "Hiring", bar: "bg-[color:var(--hot)]" },
  { key: "news" as const, label: "News", bar: "bg-[color:var(--warm)]" },
  { key: "technology" as const, label: "Tech", bar: "bg-foreground/50" },
];

const CONTEXT_CONFIG = [
  { key: "web" as const, label: "Web authority", bar: "bg-[color:var(--cold)]" },
  { key: "github" as const, label: "GitHub activity", bar: "bg-[color:var(--cold)]" },
];

function SignalGrid({ signals }: { signals: SignalSet }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          Signal axes
          <span className="ml-2 font-normal text-muted-foreground">· 4 purchase-intent triggers</span>
        </p>
        <div className="grid grid-cols-2 gap-3 @2xl/main:grid-cols-4">
          {SIGNAL_CONFIG.map(({ key, label, bar }) => {
            const sig = signals[key];
            const pct = sig ? Math.round((sig.score / sig.max) * 100) : 0;
            return (
              <div key={key} className="rounded-xl border bg-muted/50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tabular-nums">{sig?.score ?? "—"}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">/{sig?.max ?? 100}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">
          Account context
          <span className="ml-2 font-normal text-muted-foreground">· excluded from score</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CONTEXT_CONFIG.map(({ key, label, bar }) => {
            const signal = signals[key];
            if (!signal) return null;
            return (
              <div key={key} className="rounded-xl border bg-muted/50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tabular-nums">{signal.score}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">/{signal.max}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn("h-full rounded-full", bar)}
                    style={{ width: `${Math.round((signal.score / signal.max) * 100)}%` }}
                  />
                </div>
                {signal.detail ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{signal.detail}</p>
                ) : null}
              </div>
            );
          })}
        </div>
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
    <div className="flex flex-col gap-4">
      <Card className="@container/card gap-4 rounded-xl py-4 shadow-xs">
        <CardHeader className="border-b px-4 pb-4 [.border-b]:pb-4">
          <CardDescription>Intent score</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            <span
              className="flex size-8 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: avColor(result.company) }}
              aria-hidden
            >
              {result.company[0]}
            </span>
            {result.company}
          </CardTitle>
          <CardAction>
            <BandBadge band={result.score_band} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center">
          <ScoreRing score={result.intent_score} band={result.score_band} />
          <div className="min-w-0 flex-1 space-y-2 text-sm text-muted-foreground">
            <p className="text-foreground">{result.domain}</p>
            {result.ai_summary ? <p className="leading-relaxed">{result.ai_summary}</p> : null}
            <div className="flex flex-wrap gap-2">
              {result.buying_stage ? <Badge variant="outline" className="rounded-md font-normal">{result.buying_stage}</Badge> : null}
              {result.urgency ? <Badge variant="outline" className="rounded-md font-normal">Urgency {result.urgency}</Badge> : null}
              {result.data_coverage != null ? (
                <span className="tabular-nums">Coverage {Math.round(result.data_coverage * 100)}%</span>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t px-4 pt-4">
          {onWatchlist ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={onWatchlist}
              disabled={watchlistAdding || watchlistAdded}
            >
              {watchlistAdded ? "Watching" : watchlistAdding ? "Adding…" : "Save to list"}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
            <a
              href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(result.company)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open account
            </a>
          </Button>
          {onCopyEmail ? (
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={onCopyEmail}
              disabled={!result.email_subject && !result.talk_track}
            >
              {emailCopied ? "Copied" : "Copy outreach"}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
      {result.signals ? (
        <Card className="gap-4 rounded-xl py-4 shadow-xs">
          <CardContent className="px-4">
            <SignalGrid signals={result.signals} />
          </CardContent>
        </Card>
      ) : null}
      {(result.recommended_action || result.why_now) && (
        <Card className="gap-3 rounded-xl border-l-4 border-l-foreground/25 py-4 shadow-xs">
          <CardHeader className="px-4">
            <CardDescription>AI verdict</CardDescription>
            <CardTitle className="text-base leading-snug">
              {result.recommended_action ?? "Next step"}
            </CardTitle>
          </CardHeader>
          {result.why_now ? (
            <CardContent className="px-4 text-sm text-muted-foreground">{result.why_now}</CardContent>
          ) : null}
        </Card>
      )}
    </div>
  );
}
