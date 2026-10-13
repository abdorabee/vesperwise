"use client";

import type { FireBucket } from "@/lib/autopilot-display";

interface FireHistoryChartProps {
  buckets: FireBucket[];
  peak: { count: number; date: string } | null;
}

export default function FireHistoryChart({ buckets, peak }: FireHistoryChartProps) {
  const max = Math.max(...buckets.map(b => b.count), 1);
  const barW = 14;
  const gap = 6;
  const height = 90;

  return (
    <div className="ap-history">
      <div className="ap-history-head">
        <div className="title">Fire history · 30 days</div>
        {peak && (
          <div style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
            Peak {peak.count} fires on {peak.date}
          </div>
        )}
      </div>
      <div className="ap-history-svg-wrap">
        <svg className="ap-history-svg" width="100%" height={height} viewBox={`0 0 ${buckets.length * (barW + gap)} ${height}`} preserveAspectRatio="none">
          {buckets.map((b, i) => {
            const h = b.count > 0 ? Math.max(4, Math.round((b.count / max) * (height - 8))) : 0;
            return (
              <rect
                key={b.iso}
                x={i * (barW + gap)}
                y={height - h}
                width={barW}
                height={h}
                fill="var(--hot)"
                fillOpacity={0.7}
                rx={1}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
