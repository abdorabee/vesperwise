import Link from "next/link";
import { ArrowRight, ArrowUp } from "lucide-react";

import { PageSurface } from "@/components/app-ui/page-primitives";
import { BandPill, CompanyMark } from "@/components/score/band";
import { Skeleton } from "@/components/ui/skeleton";
import type { HotCandidate } from "@/lib/dashboard-home";

export interface HotAccountRow extends HotCandidate {
  chips: string[];
  reason: string | null;
}

export function lastScoreHref(domain: string) {
  return `/score?domain=${encodeURIComponent(domain)}&view=last`;
}

function ViewAll() {
  return (
    <Link
      href="/pipeline"
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
    >
      View all
      <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.75} />
    </Link>
  );
}

const TITLE = "Hot accounts to act on";

export function HotAccounts({ rows }: { rows: HotAccountRow[] }) {
  return (
    <PageSurface
      title={TITLE}
      description="Highest intent right now, then the biggest risers"
      action={<ViewAll />}
      className="bg-card"
    >
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No HOT or rising accounts yet. Accounts appear here once they score 75+ or jump 10+ points.
        </p>
      ) : (
        <ol className="divide-y divide-border/70">
          {rows.map((row) => (
            <li key={row.domain}>
              <Link
                href={lastScoreHref(row.domain)}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3.5 transition-colors duration-150 outline-none hover:bg-muted/50 focus-visible:bg-muted/60 motion-reduce:transition-none"
              >
                <CompanyMark domain={row.domain} name={row.company} size={28} className="mt-0.5" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{row.company}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">{row.domain}</span>
                  </div>
                  {row.reason ? (
                    <p className="mt-0.5 line-clamp-1 text-[13px] leading-5 text-muted-foreground">{row.reason}</p>
                  ) : null}
                  {row.chips.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] leading-4 font-medium text-foreground/80 tabular-nums"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2.5 pt-0.5">
                  {row.delta != null && row.delta > 0 ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--success)] tabular-nums"
                      aria-label={`Up ${row.delta} points since the previous score`}
                    >
                      <ArrowUp aria-hidden className="size-3" strokeWidth={2} />
                      {row.delta}
                    </span>
                  ) : null}
                  <span className="text-lg leading-none font-semibold tracking-[-0.03em] text-foreground tabular-nums">
                    {row.score}
                  </span>
                  <BandPill band={row.band} size="sm" />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </PageSurface>
  );
}

export function HotAccountsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <PageSurface title={TITLE} description="Highest intent right now, then the biggest risers" className="bg-card" aria-busy="true">
      <div className="divide-y divide-border/70">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3.5">
            <Skeleton className="size-7 rounded-md bg-muted" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40 bg-muted" />
              <Skeleton className="h-3.5 w-full max-w-sm bg-muted" />
              <Skeleton className="h-4 w-28 bg-muted" />
            </div>
            <Skeleton className="h-5 w-20 bg-muted" />
          </div>
        ))}
      </div>
    </PageSurface>
  );
}
