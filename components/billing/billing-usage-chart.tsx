"use client";

import { useState, useMemo, type ReactElement } from "react";
import type { BillingStats, DailyUsageDay } from "@/lib/billing-stats";

const SEGMENTS = [
  { key: "score" as const, label: "Score", color: "#dfff00" },
  { key: "bulk" as const, label: "Bulk", color: "#a0a0a0" },
  { key: "people" as const, label: "People", color: "#4ade80" },
  { key: "autopilot" as const, label: "Autopilot", color: "#f5b544" },
  { key: "chat" as const, label: "Chat", color: "#8a8f98" },
];

const SVG_W = 600;
const SVG_H = 162;

type Range = "7D" | "30D" | "90D" | "YTD";

interface BillingUsageChartProps {
  stats: BillingStats;
}

function sliceDays(days: DailyUsageDay[], range: Range): DailyUsageDay[] {
  if (range === "7D") return days.slice(-7);
  if (range === "YTD") {
    const jan1 = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    return days.filter((d) => d.date >= jan1);
  }
  return days.slice(-30); // 30D and 90D both use the 30d data we have
}

function handleExportCSV(days: DailyUsageDay[]) {
  const csv = [
    ["date", "score", "bulk", "people", "autopilot", "chat", "other", "total"].join(","),
    ...days.map((d) =>
      [d.date, d.score, d.bulk, d.people, d.autopilot, d.chat, d.other, d.total].join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "credit-usage.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BillingUsageChart({ stats }: BillingUsageChartProps) {
  const [range, setRange] = useState<Range>("30D");

  const days = useMemo(() => sliceDays(stats.dailyUsage, range), [stats.dailyUsage, range]);

  const maxY = useMemo(() => {
    const m = Math.max(...days.map((d) => d.total), 1);
    // Round up to a "nice" number (multiple of 4 for 5 gridline ticks)
    const raw = Math.ceil(m / 4) * 4;
    return raw < 4 ? 4 : raw;
  }, [days]);

  const step = maxY / 4;
  const yTicks = [maxY, step * 3, step * 2, step, 0];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = days.findIndex((d) => d.date === todayStr);
  const effectiveTodayIdx = todayIdx >= 0 ? todayIdx : days.length - 1;

  const barStep = SVG_W / Math.max(days.length, 1);
  const barW = Math.max(barStep - 1, 1);

  const todayX = (effectiveTodayIdx + 0.5) * barStep;

  // Depletion: how many days past today
  const depletionDays = stats.daysUntilDeplete;
  const depletionIdx =
    depletionDays != null && stats.depletesBeforeRenewal
      ? effectiveTodayIdx + depletionDays
      : null;
  const depletionX = depletionIdx != null ? (depletionIdx + 0.5) * barStep : null;
  // Projection labels are intentionally anchored to the current render snapshot.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const depletionDate =
    depletionDays != null
      ? new Date(now + depletionDays * 86400000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;

  // Projection burn rate per day
  const burnPerDay = stats.burnRate7d;

  const totals = SEGMENTS.map((s) => ({
    ...s,
    total: days.reduce((sum, d) => sum + d[s.key], 0),
  })).filter((s) => s.total > 0);

  // X-axis labels: pick at most 7 evenly-spaced dates
  const labelIdxs = useMemo(() => {
    if (days.length <= 7) return days.map((_, i) => i);
    const step = Math.floor(days.length / 6);
    const idxs: number[] = [];
    for (let i = 0; i < days.length; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== days.length - 1) idxs.push(days.length - 1);
    return idxs;
  }, [days]);

  return (
    <div className="usage-panel">
      <div className="usage-head">
        <div>
          <div className="t">Daily credit consumption</div>
          <div className="s">Stacked by feature · projection through reset shown dashed</div>
        </div>
        <div className="right">
          <div className="range-tabs">
            {(["7D", "30D", "90D", "YTD"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`range-tab${range === r ? " active" : ""}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mini-ic"
            title="Download CSV"
            onClick={() => handleExportCSV(days)}
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
              <path d="M3 7l3 3 3-3M6 1v9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="usage-body">
        <div className="usage-legend">
          {totals.map((s) => (
            <span key={s.key} className="leg">
              <span className="sw" style={{ background: s.color }} />
              {s.label} · <span className="v">{s.total.toLocaleString()}</span>
            </span>
          ))}
          {burnPerDay > 0 && (
            <span
              className="leg"
              style={{ marginLeft: "auto" }}
            >
              <span
                className="sw"
                style={{
                  background: "repeating-linear-gradient(45deg,#f5b544,#f5b544 2px,transparent 2px,transparent 4px)",
                  border: "1px solid #f5b544",
                  borderRadius: 2,
                }}
              />
              Projection
            </span>
          )}
        </div>

        <div className="usage-chart-wrap">
          <div className="usage-yax">
            {yTicks.map((t) => (
              <span key={t}>{t === 0 ? "0" : t}</span>
            ))}
          </div>

          <div className="usage-chart" style={{ position: "relative" }}>
            {/* TODAY label */}
            {todayIdx >= 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: todayX,
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.08em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                TODAY
              </div>
            )}
            {/* DEPLETION label */}
            {depletionX != null && depletionDate && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${(depletionX / SVG_W) * 100}%`,
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--warm)",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                DEPLETION – {depletionDate.toUpperCase()}
              </div>
            )}

            <svg
              className="usage-svg"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="none"
              style={{ display: "block", width: "100%", height: SVG_H }}
            >
              <defs>
                <pattern id="proj-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="rgba(245,181,68,0.08)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(245,181,68,0.25)" strokeWidth="2" />
                </pattern>
              </defs>

              {/* Horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                <line
                  key={pct}
                  x1={0}
                  y1={SVG_H * (1 - pct)}
                  x2={SVG_W}
                  y2={SVG_H * (1 - pct)}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                />
              ))}

              {/* Bars */}
              {days.map((day, i) => {
                const x = i * barStep;
                const isFuture = i > effectiveTodayIdx;

                if (isFuture) {
                  // Projection bar: estimated height from burn rate, hatched
                  const projH = maxY > 0 ? (burnPerDay / maxY) * SVG_H : 0;
                  const projY = SVG_H - projH;
                  return (
                    <rect
                      key={day.date}
                      x={x}
                      y={projY}
                      width={barW}
                      height={projH}
                      fill="url(#proj-hatch)"
                      stroke="rgba(245,181,68,0.3)"
                      strokeWidth={0.5}
                    />
                  );
                }

                if (day.total <= 0) return null;

                // Stacked solid bars — bottom-up accumulation
                const barTotalH = (day.total / maxY) * SVG_H;
                const rects: ReactElement[] = [];
                let accH = 0;

                for (const seg of SEGMENTS) {
                  const val = day[seg.key];
                  if (val <= 0) continue;
                  const segH = (val / maxY) * SVG_H;
                  const segY = SVG_H - accH - segH;
                  rects.push(
                    <rect
                      key={seg.key}
                      x={x}
                      y={segY}
                      width={barW}
                      height={segH}
                      fill={seg.color}
                    />,
                  );
                  accH += segH;
                }

                // Clip group to barTotalH to keep consistent height
                return (
                  <g key={day.date}>
                    <clipPath id={`clip-${i}`}>
                      <rect x={x} y={SVG_H - barTotalH} width={barW} height={barTotalH} />
                    </clipPath>
                    <g clipPath={`url(#clip-${i})`}>{rects}</g>
                  </g>
                );
              })}

              {/* TODAY vertical line */}
              {todayIdx >= 0 && (
                <line
                  x1={todayX}
                  y1={10}
                  x2={todayX}
                  y2={SVG_H}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={1}
                />
              )}

              {/* DEPLETION vertical line */}
              {depletionX != null && (
                <line
                  x1={depletionX}
                  y1={10}
                  x2={depletionX}
                  y2={SVG_H}
                  stroke="rgba(245,181,68,0.6)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
            </svg>

            {/* X-axis labels */}
            <div className="usage-xax" style={{ position: "relative" }}>
              {days.map((day, i) => {
                const isLabeled = labelIdxs.includes(i);
                if (!isLabeled) return <span key={day.date} />;
                return (
                  <span key={day.date}>
                    {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
