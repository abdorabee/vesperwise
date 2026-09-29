import type { BillingStats } from "@/lib/billing-stats";

interface BillingCostBreakdownProps {
  stats: BillingStats;
}

function formatCycleRange(cycleStart: string): string {
  const start = new Date(cycleStart);
  const now = new Date();
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const nowStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startStr} – ${nowStr} · grouped by feature`;
}

function daysElapsed(cycleStart: string): number {
  return Math.max(1, Math.ceil((Date.now() - new Date(cycleStart).getTime()) / 86400000));
}

export function BillingCostBreakdown({ stats }: BillingCostBreakdownProps) {
  const cycleRange = formatCycleRange(stats.cycleStart);
  const days = daysElapsed(stats.cycleStart);
  // Only list features that actually spent credits (Score always shows as the baseline).
  const visibleBuckets = stats.costBuckets.filter((row) => row.credits > 0 || row.bucket === "Score");

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="t">Where credits went</div>
          <div className="s">This cycle · {cycleRange}</div>
        </div>
      </div>

      {visibleBuckets.map((row) => (
        <div key={row.bucket} className="cost-row">
          <span className="lbl">
            <span className="sw" style={{ background: row.color }} />
            {row.label}
          </span>
          <div className="bar-wrap">
            <div
              className="bar"
              style={{
                width: `${row.pct}%`,
                minWidth: row.credits > 0 && row.pct === 0 ? 2 : undefined,
                background: row.color,
              }}
            />
          </div>
          <span className="v">
            {row.bucket === "Chat" && row.credits > 0 && row.credits < 1
              ? `${row.credits} ea`
              : row.credits.toLocaleString()}
          </span>
          <span className="pct">
            {row.pct > 0 ? `${row.pct}%` : row.credits > 0 ? "<1%" : "0%"}
          </span>
        </div>
      ))}
      <div className="cost-foot">
        <span className="tot-label">Total used · {days} days</span>
        <span className="tot">{stats.totalCycleDebits.toLocaleString()} credits</span>
      </div>
    </div>
  );
}
