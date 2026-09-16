"use client";

import type { WatchlistRange, WatchlistStats } from "@/lib/watchlist-stats";
import { formatRelativeTime } from "@/lib/watchlist-stats";

interface WatchlistPageHeadProps {
  stats: WatchlistStats["stats"];
  range: WatchlistRange;
  onRangeChange: (range: WatchlistRange) => void;
  onExport: () => void;
}

const RANGES: WatchlistRange[] = ["24H", "7D", "30D", "90D"];

export function WatchlistPageHead({ stats, range, onRangeChange, onExport }: WatchlistPageHeadProps) {
  const refreshLabel = stats.lastRefreshAt
    ? formatRelativeTime(stats.lastRefreshAt)
    : "never";

  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">Watchlist</h1>
        <div className="page-sub">
          {stats.total} account{stats.total === 1 ? "" : "s"} · {stats.hotCrossedToday} threshold
          {stats.hotCrossedToday === 1 ? "" : "s"} tripped today · last refresh{" "}
          <span className="mono" style={{ color: "var(--text-secondary)" }}>
            {refreshLabel}
          </span>{" "}
          ago
        </div>
      </div>
      <div className="page-actions">
        <div className="range-tabs">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`range-tab${range === r ? " active" : ""}`}
              onClick={() => onRangeChange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <button type="button" className="tb-btn outlined" disabled title="Coming soon">
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M2 4h8v6H2z M2 4l4 3 4-3" />
          </svg>
          Alert prefs
        </button>
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
