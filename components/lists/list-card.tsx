import Link from "next/link";

import type { ListCardSummary } from "@/lib/lists-types";
import { deltaLabel, pluralize } from "@/lib/lists-display";

interface ListCardProps {
  summary: ListCardSummary;
}

function typeLabel(summary: ListCardSummary): string {
  if (summary.isSystem) return "Watchlist · synced";
  return summary.list_type === "smart" ? "Smart" : "Manual";
}

function sparklineLabel(sparkline: number[]): string {
  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  const trend = last > first ? "rising" : last < first ? "falling" : "flat";
  return `Average score trend, ${trend}: ${first} to ${last} over ${pluralize(sparkline.length, "day")} with data`;
}

export function ListCard({ summary }: ListCardProps) {
  const { bandMix, sparkline } = summary;
  const added = deltaLabel(summary.addedThisWeek, " added this week");

  return (
    <Link
      href={`/lists/${summary.id}`}
      className="list-card"
      aria-label={`${summary.name}, ${pluralize(summary.accountCount, "account")}`}
    >
      <div className="list-card-head">
        <div className="lc-av" aria-hidden="true">{summary.icon_initials}</div>
        <div className="lc-info">
          <div className="lc-title-row">
            <div className="lc-title">{summary.name}</div>
            <span className={`lc-tag ${summary.isSystem ? "manual" : summary.list_type}`}>{typeLabel(summary)}</span>
          </div>
          {summary.description && <div className="lc-desc">{summary.description}</div>}
        </div>
      </div>
      <div className="list-card-mid">
        <div className="lc-count">
          <div className="n">{summary.accountCount}</div>
          <div className="l">{summary.accountCount === 1 ? "Account" : "Accounts"}</div>
          {added && <div className="delta">{added}</div>}
        </div>
        {sparkline.length >= 2 && (
          <div className="lc-spark" role="img" aria-label={sparklineLabel(sparkline)}>
            {sparkline.map((h, i) => (
              <div
                key={i}
                className={`b${i === sparkline.length - 1 ? " hl" : ""}`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="lc-mixbar" aria-hidden="true">
        <div className="seg" style={{ background: "var(--hot)", flex: bandMix.hot }} />
        <div className="seg" style={{ background: "var(--warm)", flex: bandMix.warm }} />
        <div className="seg" style={{ background: "var(--cold)", opacity: 0.7, flex: bandMix.cold }} />
      </div>
      <div className="lc-mixbar-leg">
        <span><span className="sw" style={{ background: "var(--hot)" }} />HOT {bandMix.hot}</span>
        <span><span className="sw" style={{ background: "var(--warm)" }} />WARM {bandMix.warm}</span>
        <span><span className="sw" style={{ background: "var(--cold)", opacity: 0.7 }} />COLD {bandMix.cold}</span>
        <span className="avg">avg {summary.avgScore || "—"}</span>
      </div>
      <div className="list-card-foot">
        <div className="lc-last">{summary.lastUpdatedLabel}</div>
      </div>
    </Link>
  );
}
