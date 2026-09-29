"use client";

import BloubMascot from "@/components/mascot/bloub-mascot";
import { BandPill, CompanyMark } from "@/components/score/band";
import { Button } from "@/components/ui/button";
import { ScoreComposer } from "@/components/score/score-composer";
import { formatAbsoluteDate, formatRelativeTime } from "@/lib/time-ago";
import type { ScoreBand } from "@/lib/types";

const EXAMPLES = ["stripe.com", "anthropic.com", "linear.app"];

export interface RecentScoreRow {
  domain: string;
  company_name: string;
  score: number | null;
  score_band: ScoreBand | null;
  created_at: string;
}

function RecentScores({ rows, onOpen, busy }: { rows: RecentScoreRow[]; onOpen: (domain: string) => void; busy: boolean }) {
  // One row per domain, newest first, max 6.
  const seen = new Set<string>();
  const unique = rows.filter((row) => {
    if (row.score == null || !row.score_band || seen.has(row.domain)) return false;
    seen.add(row.domain);
    return true;
  }).slice(0, 6);
  if (unique.length === 0) return null;
  return (
    <section aria-labelledby="recent-scores-title" className="mt-10 w-full text-left">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="recent-scores-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Recent</h2>
        <span className="text-xs text-muted-foreground">Opens the stored result · no credit</span>
      </div>
      <ul className="mt-2 divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70">
        {unique.map((row) => (
          <li key={row.domain}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpen(row.domain)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60 motion-reduce:transition-none"
            >
              <CompanyMark domain={row.domain} name={row.company_name} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{row.company_name || row.domain}</span>
                <span className="block truncate text-xs text-muted-foreground">{row.domain}</span>
              </span>
              <span className="w-8 text-right text-sm font-semibold tabular-nums text-foreground">{row.score}</span>
              <BandPill band={row.score_band!} size="sm" className="w-[4.25rem] justify-center" />
              <span suppressHydrationWarning title={formatAbsoluteDate(row.created_at) ?? undefined} className="hidden w-20 text-right text-xs tabular-nums text-muted-foreground sm:block">{formatRelativeTime(row.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ScoreEmptyState({
  onSubmit,
  onOpenRecent,
  recentScores = [],
  creditsRemaining,
  busy,
}: {
  onSubmit: (value: string) => void;
  onOpenRecent?: (domain: string) => void;
  recentScores?: RecentScoreRow[];
  creditsRemaining: number;
  busy: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-xl flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="score-bloub score-bloub-waiting mb-5 text-primary" aria-label="Bloub is waiting">
        <BloubMascot size={38} color="currentColor" paper="transparent" follow={false} playing={false} />
      </div>
      <h1 className="text-balance text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Which company should we score?</h1>
      <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">Enter a domain to verify dated purchase signals and decide whether the account is worth pursuing now.</p>
      <div className="mt-8 w-full"><ScoreComposer initial autoFocus busy={busy} onSubmit={onSubmit} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground"><span>Try</span>{EXAMPLES.map((domain) => <Button key={domain} type="button" variant="link" size="xs" disabled={busy} className="h-auto px-1 py-0 text-xs" onClick={() => onSubmit(domain)}>{domain}</Button>)}</div>
      <p className="mt-3 text-xs text-muted-foreground"><span className="font-medium tabular-nums text-foreground">{creditsRemaining}</span> credits remaining · cached results are free</p>
      {onOpenRecent ? <RecentScores rows={recentScores} onOpen={onOpenRecent} busy={busy} /> : null}
    </div>
  );
}
