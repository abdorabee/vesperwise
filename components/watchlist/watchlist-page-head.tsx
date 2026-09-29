"use client";

import type { WatchlistRange, WatchlistStats } from "@/lib/watchlist-stats";
import { formatRelativeTime } from "@/lib/time-ago";

interface WatchlistPageHeadProps {
  stats: WatchlistStats["stats"];
  range: WatchlistRange;
  onRangeChange: (range: WatchlistRange) => void;
  onExport: () => void;
}

const RANGES: WatchlistRange[] = ["24H", "7D", "30D", "90D"];

export function WatchlistPageHead({ stats, range, onRangeChange, onExport }: WatchlistPageHeadProps) {
  const refreshed = formatRelativeTime(stats.lastRefreshAt);

  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">Watchlist</h1>
        <div className="page-sub">
          {stats.total} account{stats.total === 1 ? "" : "s"} · {stats.hotCrossedToday} threshold
          {stats.hotCrossedToday === 1 ? "" : "s"} tripped today ·{" "}
          {refreshed ? (
            <>
              refreshed{" "}
              <span suppressHydrationWarning style={{ color: "var(--text-secondary)" }}>{refreshed}</span>
            </>
          ) : (
            "not refreshed yet"
          )}
        </div>
      </div>
      <div className="page-actions">
        <div className="range-tabs" role="group" aria-label="Trend range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              className={`range-tab${range === r ? " active" : ""}`}
              onClick={() => onRangeChange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <button type="button" className="tb-btn outlined" onClick={onExport}>
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="2" y="3" width="8" height="6" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}
