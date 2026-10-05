"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { PageSurface } from "@/components/app-ui/page-primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BANDS, TREND_MIN_DAYS, type BandCounts, type TrendDay } from "@/lib/dashboard-home";
import type { ScoreBand } from "@/lib/types";

/**
 * Band colors match ScoreMeter. Identity is never color alone: legend,
 * tooltip and table all name the band. Checked with
 * the dataviz validator in both modes: adjacent CVD ΔE ≥ 15 and every mark
 * ≥ 3:1 against the card surface. Identity is never colour alone: legend,
 * tooltip and table all name the band.
 */
const MARK: Record<ScoreBand, string> = {
  HOT: "bg-[var(--band-hot-fill)]",
  WARM: "bg-[var(--band-warm-fill)]",
  COLD: "bg-[var(--band-cold-fill)]",
};

const LABEL: Record<ScoreBand, string> = { HOT: "HOT", WARM: "Warm", COLD: "Cold" };
// Stack from the baseline up: HOT sits on the axis so it is the easiest to compare.
const STACK: readonly ScoreBand[] = ["HOT", "WARM", "COLD"];

const total = (d: BandCounts) => d.HOT + d.WARM + d.COLD;

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

function formatDay(date: string, withWeekday = false) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: withWeekday ? "short" : undefined,
    timeZone: "UTC",
  });
}

function Legend({ counts }: { counts: BandCounts }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {BANDS.map((band) => (
        <li key={band} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-[3px]", MARK[band])} />
          {LABEL[band]}
          <span className="font-medium text-foreground tabular-nums">{counts[band]}</span>
        </li>
      ))}
    </ul>
  );
}

function SplitBar({ counts }: { counts: BandCounts }) {
  const sum = total(counts);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full gap-[2px]" role="img" aria-label={BANDS.map((b) => `${counts[b]} ${LABEL[b]}`).join(", ")}>
        {STACK.filter((b) => counts[b] > 0).map((band) => (
          <div
            key={band}
            className={cn("h-full first:rounded-l-[4px] last:rounded-r-[4px]", MARK[band])}
            style={{ flexGrow: counts[band], flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        {STACK.map((band) => (
          <li key={band}>
            <span className="block text-lg font-semibold text-foreground tabular-nums">
              {sum > 0 ? Math.round((counts[band] / sum) * 100) : 0}%
            </span>
            {counts[band]} {LABEL[band]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataTable({ days }: { days: TrendDay[] }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Accounts per band at the end of each day</caption>
      <thead>
        <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
          <th scope="col" className="py-2 font-medium">Date</th>
          {BANDS.map((b) => (
            <th key={b} scope="col" className="py-2 text-right font-medium">{LABEL[b]}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        {[...days].reverse().map((d) => (
          <tr key={d.date}>
            <th scope="row" className="py-1.5 text-left font-normal text-muted-foreground">{formatDay(d.date, true)}</th>
            {BANDS.map((b) => (
              <td key={b} className="py-1.5 text-right tabular-nums">{d[b]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StackedColumns({ days }: { days: TrendDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...days.map(total)));
  const n = days.length;
  const focused = active != null ? days[active] : null;

  const indexFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    return Math.max(0, Math.min(n - 1, i));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? n - 1;
    const next =
      e.key === "ArrowLeft" ? current - 1 : e.key === "ArrowRight" ? current + 1 : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next == null) return;
    e.preventDefault();
    setActive(Math.max(0, Math.min(n - 1, next)));
  };

  const tooltipAlign = active == null ? "" : active < n * 0.2 ? "translate-x-0" : active > n * 0.8 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      {/* y-axis */}
      <div aria-hidden className="relative h-44 w-7 text-right text-[10px] text-muted-foreground tabular-nums">
        {[max, max / 2, 0].map((tick, i) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${i * 50}%` }}>
            {Number.isInteger(tick) ? tick : tick.toFixed(1)}
          </span>
        ))}
      </div>

      <div
        role="group"
        tabIndex={0}
        aria-label="Accounts per band by day. Use the arrow keys to read each day."
        onPointerMove={(e) => setActive(indexFromPointer(e))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
        className="relative h-44 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
      >
        {/* recessive hairline grid */}
        {[0, 50, 100].map((top) => (
          <span key={top} aria-hidden className="absolute inset-x-0 h-px bg-border" style={{ top: `${top}%` }} />
        ))}

        <div className="absolute inset-0 flex items-end">
          {days.map((d, i) => {
            const sum = total(d);
            return (
              <div key={d.date} className="flex h-full min-w-0 flex-1 items-end justify-center px-px">
                {sum > 0 ? (
                  <div
                    className={cn(
                      "flex w-full max-w-6 flex-col-reverse gap-[2px] transition-opacity duration-150 motion-reduce:transition-none",
                      active != null && active !== i && "opacity-45",
                    )}
                    style={{ height: `${(sum / max) * 100}%` }}
                  >
                    {STACK.filter((b) => d[b] > 0).map((band) => (
                      <div
                        key={band}
                        className={cn("min-h-px last:rounded-t-[4px]", MARK[band])}
                        style={{ flexGrow: d[band], flexBasis: 0 }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {focused && active != null ? (
          <div
            role="status"
            className={cn(
              "pointer-events-none absolute -top-2 z-10 min-w-36 -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
              tooltipAlign,
            )}
            style={{ left: `${((active + 0.5) / n) * 100}%` }}
          >
            <p className="mb-1.5 font-medium text-muted-foreground">{formatDay(focused.date, true)}</p>
            <ul className="flex flex-col gap-1">
              {BANDS.map((band) => (
                <li key={band} className="flex items-center gap-2">
                  <span aria-hidden className={cn("h-0.5 w-3 rounded-full", MARK[band])} />
                  <span className="font-semibold text-foreground tabular-nums">{focused[band]}</span>
                  <span className="text-muted-foreground">{LABEL[band]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* x-axis */}
      <div aria-hidden className="col-start-2 mt-2 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{formatDay(days[0].date)}</span>
        {n > 2 ? <span>{formatDay(days[Math.floor((n - 1) / 2)].date)}</span> : null}
        <span>Today</span>
      </div>
    </div>
  );
}

export function BandTrend({
  days,
  activeDays,
  current,
  rangeLabel,
}: {
  days: TrendDay[];
  activeDays: number;
  current: BandCounts;
  rangeLabel: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const hasTrend = activeDays >= TREND_MIN_DAYS && days.length > 0;

  return (
    <PageSurface
      title="Band trend"
      description={hasTrend ? `Tracked accounts per band at the end of each day · ${rangeLabel}` : "Current split of tracked accounts"}
      action={
        hasTrend ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-pressed={view === "table"}
            onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          >
            {view === "chart" ? "Show table" : "Show chart"}
          </Button>
        ) : null
      }
      className="bg-card"
    >
      <div className="flex flex-col gap-4 px-5 py-5">
        {hasTrend ? (
          <>
            <Legend counts={current} />
            {view === "chart" ? <StackedColumns days={days} /> : <DataTable days={days} />}
          </>
        ) : (
          <>
            <SplitBar counts={current} />
            <p className="text-xs text-muted-foreground">
              Trend appears after {TREND_MIN_DAYS} days of scoring
              {activeDays > 0 ? ` (${activeDays} so far in this range)` : ""}.
            </p>
          </>
        )}
      </div>
    </PageSurface>
  );
}
