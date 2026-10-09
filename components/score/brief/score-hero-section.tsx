"use client";

import { ArrowUpRight } from "lucide-react";
import { BandPill, CompanyMark, ScoreMeter, ScoreNumber } from "@/components/score/band";
import { formatAbsoluteDate, formatRelativeTime } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import { formatOffset } from "./brief-ui";
import type { BriefSectionProps } from "./types";

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function ScoreHeroSection({ block, displayScore, displayBand, fresh, state, now }: BriefSectionProps) {
  const site = safeUrl(`https://${block.domain}`);
  const projected = state.offsetDays > 0;
  const fetched = formatRelativeTime(block.last_updated);
  const coverage = block.data_coverage == null ? null : `${Math.round(block.data_coverage * 100)}% coverage`;

  return (
    <header data-slot="living-brief-hero" className="space-y-5 border-b border-border/70 pb-5">
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
          {coverage ? <span>{coverage}</span> : null}
        </div>
      </div>

      <div className="space-y-4">
        <p className="sr-only">Projected score {Math.round(displayScore)} of 100, {displayBand}</p>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <ScoreNumber value={displayScore} animate={fresh && state.offsetDays === 0} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-1.5">
            <BandPill band={displayBand} className={fresh && state.offsetDays === 0 ? "score-band-land" : undefined} />
            {projected ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">in {formatOffset(state.offsetDays)}</span>
                <span aria-hidden="true" className="px-1.5 text-border">·</span>
                <span className="line-through decoration-border">{now.score} {now.band} today</span>
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                today
                {state.elapsedDays > 0 && now.score !== block.intent_score ? (
                  <span className="font-normal"> · was {block.intent_score} {block.score_band} when scored</span>
                ) : null}
              </p>
            )}
          </div>
        </div>
        <ScoreMeter value={displayScore} band={displayBand} className={cn("max-w-xl", projected && "transition-[width] duration-300")} />
      </div>
    </header>
  );
}
