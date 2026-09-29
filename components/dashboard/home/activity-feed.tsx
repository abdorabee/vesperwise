import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageSurface } from "@/components/app-ui/page-primitives";
import { BandPill, CompanyMark } from "@/components/score/band";
import { relTime, type ActivityEvent } from "@/lib/dashboard-home";
import { lastScoreHref } from "./hot-accounts";

function changeLine(event: ActivityEvent): string | null {
  if (event.fromBand) {
    const delta = event.delta != null && event.delta !== 0 ? ` (${event.delta > 0 ? "+" : ""}${event.delta})` : "";
    return `Moved from ${event.fromBand}${delta}`;
  }
  if (event.delta != null && Math.abs(event.delta) >= 5) {
    return `${event.delta > 0 ? "Up" : "Down"} ${Math.abs(event.delta)} since last score`;
  }
  return null;
}

export function ActivityFeed({
  events,
  rangeLabel,
  now,
}: {
  events: ActivityEvent[];
  rangeLabel: string;
  now: number;
}) {
  return (
    <PageSurface
      title="Recent scores"
      description={`Latest score events · ${rangeLabel}`}
      action={
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          History
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.75} />
        </Link>
      }
      className="bg-card"
    >
      {events.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No scores in this range.</p>
      ) : (
        <ol className="divide-y divide-border/70">
          {events.map((event) => {
            const change = changeLine(event);
            return (
              <li key={event.id}>
                <Link
                  href={lastScoreHref(event.domain)}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors duration-150 outline-none hover:bg-muted/50 focus-visible:bg-muted/60 motion-reduce:transition-none"
                >
                  <CompanyMark domain={event.domain} name={event.company} size={20} />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{event.company}</span>
                      <span className="text-sm text-foreground tabular-nums">{event.score}</span>
                      <BandPill band={event.band} size="sm" />
                    </div>
                    {change ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{change}</p> : null}
                  </div>
                  <time
                    dateTime={event.createdAt}
                    title={new Date(event.createdAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
                    className="text-xs text-muted-foreground tabular-nums"
                  >
                    {relTime(event.createdAt, now)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </PageSurface>
  );
}
