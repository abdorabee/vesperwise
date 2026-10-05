"use client";

import type { ListCardSummary } from "@/lib/lists-types";
import { deltaLabel } from "@/lib/lists-display";

interface ListCardProps {
  summary: ListCardSummary;
  onClick: () => void;
}

export function ListCard({ summary, onClick }: ListCardProps) {
  const { bandMix } = summary;
  const deltaClass = summary.weeklyDelta > 0 ? "" : summary.weeklyDelta < 0 ? "down" : "flat";

  return (
    <div className="list-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className="list-card-head">
        <div className="lc-av">{summary.icon_initials}</div>
        <div className="lc-info">
          <div className="lc-title-row">
            <div className="lc-title">{summary.name}</div>
            <span className={`lc-tag ${summary.list_type}`}>
              {summary.list_type === "smart" ? "Smart" : "Manual"}
            </span>
          </div>
          {summary.description && <div className="lc-desc">{summary.description}</div>}
        </div>
      </div>
      <div className="list-card-mid">
        <div className="lc-count">
          <div className="n">{summary.accountCount}</div>
          <div className="l">Accounts</div>
          <div className={`delta ${deltaClass}`}>{deltaLabel(summary.weeklyDelta)}</div>
        </div>
        <div className="lc-spark">
          {summary.sparkline.map((h, i) => (
            <div
              key={i}
              className={`b${i === summary.sparkline.length - 1 ? " hl" : ""}`}
              style={{ height: `${Math.max(h, 4)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="lc-mixbar">
        <div className="seg" style={{ background: "var(--band-hot-fill)", flex: Math.max(bandMix.hot, 0) }} />
        <div className="seg" style={{ background: "var(--band-warm-fill)", flex: Math.max(bandMix.warm, 0) }} />
        <div className="seg" style={{ background: "var(--band-cold-fill)", flex: Math.max(bandMix.cold, 0) }} />
      </div>
      <div className="lc-mixbar-leg">
        <span><span className="sw" style={{ background: "var(--band-hot-fill)" }} />HOT {bandMix.hot}</span>
        <span><span className="sw" style={{ background: "var(--band-warm-fill)" }} />WARM {bandMix.warm}</span>
        <span><span className="sw" style={{ background: "var(--band-cold-fill)" }} />COLD {bandMix.cold}</span>
        <span className="avg">avg {summary.avgScore || "—"}</span>
      </div>
      <div className="list-card-foot">
        <div className="lc-avs">
          {summary.avatarInitials.map((init, i) => (
            <div key={i} className={`av ${summary.avatarClasses[i]}`}>{init}</div>
          ))}
          {summary.accountCount > summary.avatarInitials.length && (
            <span className="more">+{summary.accountCount - summary.avatarInitials.length}</span>
          )}
        </div>
        <div className="lc-last">{summary.lastUpdatedLabel}</div>
      </div>
    </div>
  );
}
