"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityRow = {
  type: "score" | "autopilot";
  company: string;
  score: number;
  band: string;
  reason?: string;
  createdAt: string;
};

type MoverRow = {
  n: string;
  s: number;
  d: number;
  band: string;
};

type PipelineRow = {
  l: string;
  n: number;
  c: string;
  glow?: boolean;
  pct: number;
};

type SignalMixRow = {
  key: string;
  label: string;
  pct: number;
};

type WatchlistItem = {
  n: string;
  s: number;
  band: "hot" | "warm" | "cold";
};

type WorkflowRow = {
  n: string;
  active: boolean;
  fires: string;
  rate: string;
};

interface DashboardHomeViewProps {
  hotCount: number;
  warmCount: number;
  coldCount: number;
  avgHotScore: number;
  autopilotFires: number;
  creditsRemaining: number;
  creditCap: number;
  activityRows: ActivityRow[];
  topMovers: MoverRow[];
  pipeline: PipelineRow[];
  signalMix: SignalMixRow[];
  watchlist: WatchlistItem[];
  autopilotWorkflows: WorkflowRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const SIGNAL_COLORS: Record<string, string> = {
  funding: "#dfff00",
  hiring: "#4ade80",
  news: "#f5b544",
  technology: "#e8ff40",
};

const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6", "av-7", "av-8"];
function avClass(name: string): string {
  const idx = name.charCodeAt(0) % AV_CLASSES.length;
  return AV_CLASSES[idx];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardHomeView({
  hotCount,
  warmCount,
  coldCount,
  avgHotScore,
  autopilotFires,
  creditsRemaining,
  creditCap,
  activityRows,
  topMovers,
  pipeline,
  signalMix,
  watchlist,
}: DashboardHomeViewProps) {
  const [rangeTab, setRangeTab] = useState("7D");
  const [moversTab, setMoversTab] = useState<"Up" | "Down">("Up");
  const [activityTab, setActivityTab] = useState<"All" | "Mine">("All");

  const totalTracked = hotCount + warmCount + coldCount;
  const creditPct = creditCap > 0 ? Math.round((creditsRemaining / creditCap) * 100) : 0;

  const movers =
    moversTab === "Up"
      ? topMovers.filter((m) => m.d >= 0)
      : topMovers.filter((m) => m.d < 0);

  // Donut chart computation
  const totalPct = signalMix.reduce((acc, s) => acc + s.pct, 0) || 1;
  const circumference = 2 * Math.PI * 40; // r=40
  const donutSegments = signalMix.map((s, i) => {
    const dash = (s.pct / totalPct) * circumference;
    const offset = -signalMix
      .slice(0, i)
      .reduce((sum, prior) => sum + (prior.pct / totalPct) * circumference, 0);
    return { ...s, dash, offset, color: SIGNAL_COLORS[s.key] ?? "var(--text-tertiary)", idx: i };
  });

  return (
    <div style={{ fontSize: 13, letterSpacing: "-0.006em", color: "var(--text-primary)" }}>
      {/* ── Page head ─────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{totalTracked}</span>
            {" accounts tracked · "}
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{hotCount}</span>
            {" HOT right now"}
          </div>
        </div>
        <div className="page-actions">
          <div className="range-tabs">
            {(["24H", "7D", "30D", "90D"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRangeTab(t)}
                className={`range-tab${rangeTab === t ? " active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="kpis">
        {/* HOT accounts */}
        <div className="kpi">
          <div className="kpi-head">
            <span className="ic kpi-ic-hot" style={{ display: "grid", placeItems: "center", width: 14, height: 14, borderRadius: 4 }}>
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10">
                <path d="M6 1c1 2 3 3 3 5a3 3 0 11-6 0c0-1 1-2 1-3l1-2" />
              </svg>
            </span>
            HOT accounts
            <span className="more">⋯</span>
          </div>
          <div className="kpi-row">
            <span className="kpi-num">{hotCount}</span>
            <span className="kpi-delta kpi-delta-flat">vs last week</span>
          </div>
          <div className="kpi-meta">active high-intent accounts</div>
          <div className="kpi-spark">
            {[30, 42, 38, 51, 48, 70, 90].map((h, i) => (
              <div
                key={i}
                className={`b${i >= 5 ? " hot" : ""}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Avg HOT score */}
        <div className="kpi">
          <div className="kpi-head">
            <span className="ic kpi-ic-velocity" style={{ display: "grid", placeItems: "center", width: 14, height: 14, borderRadius: 4 }}>
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10">
                <path d="M2 8l3-3 2 2 3-4" />
              </svg>
            </span>
            Avg HOT-band score
            <span className="more">⋯</span>
          </div>
          <div className="kpi-row">
            <span className="kpi-num">{avgHotScore || "—"}</span>
          </div>
          <div className="kpi-meta">
            {hotCount > 0 ? `across ${hotCount} HOT accounts` : "no HOT accounts yet"}
          </div>
          <div className="kpi-spark">
            {[60, 64, 62, 71, 74, 82, 88].map((h, i) => (
              <div key={i} className={`b${i >= 5 ? " hl" : ""}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Autopilot fires */}
        <div className="kpi">
          <div className="kpi-head">
            <span className="ic kpi-ic-fires" style={{ display: "grid", placeItems: "center", width: 14, height: 14, borderRadius: 4 }}>
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10">
                <path d="M6 1l1.5 4L11 5l-3 2 1 4-3-2-3 2 1-4-3-2 3.5 0z" />
              </svg>
            </span>
            Autopilot fires
            <span className="more">⋯</span>
          </div>
          <div className="kpi-row">
            <span className="kpi-num">{autopilotFires}</span>
          </div>
          <div className="kpi-meta">Coming soon</div>
          <div className="kpi-spark">
            {[40, 55, 48, 62, 71, 78, 88].map((h, i) => (
              <div key={i} className={`b${i >= 3 ? " warm" : ""}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Credits */}
        <div className="kpi">
          <div className="kpi-head">
            <span className="ic kpi-ic-credits" style={{ display: "grid", placeItems: "center", width: 14, height: 14, borderRadius: 4 }}>
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10">
                <circle cx="6" cy="6" r="4" />
                <path d="M6 4v3l2 1" />
              </svg>
            </span>
            Credits remaining
            <span className="more">⋯</span>
          </div>
          <div className="kpi-row">
            <span className="kpi-num">{creditsRemaining.toLocaleString()}</span>
            <span className="kpi-delta kpi-delta-flat">{creditPct}%</span>
          </div>
          <div className="kpi-meta">of {creditCap.toLocaleString()} · <Link href="/billing" style={{ color: "var(--accent-2)" }}>Top up</Link></div>
          <div className="kpi-spark">
            {[32, 44, 51, 58, 62, 67, 74].map((h, i) => (
              <div key={i} className="b" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid main: chart + activity ───────────────────────────────── */}
      <div className="grid-main">
        {/* Score distribution chart */}
        <div className="card chart-card">
          <div className="card-head">
            <div>
              <div className="card-title">Score distribution</div>
              <div className="card-sub">Account count by band over time</div>
            </div>
            <div className="card-actions">
              <div className="chart-legend" style={{ marginLeft: 0 }}>
                <span className="lg hot">
                  <span className="swatch" />
                  HOT <span className="num">{hotCount}</span>
                </span>
                <span className="lg warm">
                  <span className="swatch" />
                  Warm <span className="num">{warmCount}</span>
                </span>
                <span className="lg cold">
                  <span className="swatch" />
                  Cold <span className="num">{coldCount}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="card-body">
            {totalTracked === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
                No data yet — score some accounts to see the chart
              </div>
            ) : (
              <div className="chart-svg-wrap">
                <svg
                  className="chart-svg"
                  viewBox="0 0 800 240"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="hotGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5b544" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#f5b544" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id="coldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8a8f98" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8a8f98" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
                    {[0, 60, 120, 180, 240].map((y) => (
                      <line key={y} x1="0" y1={y} x2="800" y2={y} />
                    ))}
                  </g>
                  <path d="M 0,240 L 0,140 C 50,138 100,142 150,135 S 250,128 300,125 S 400,120 450,118 S 550,114 600,116 S 700,108 800,102 L 800,240 Z" fill="url(#coldGrad)" />
                  <path d="M 0,140 C 50,138 100,142 150,135 S 250,128 300,125 S 400,120 450,118 S 550,114 600,116 S 700,108 800,102" fill="none" stroke="#8a8f98" strokeWidth="1.4" strokeOpacity="0.5" />
                  <path d="M 0,240 L 0,108 C 50,104 100,110 150,98 S 250,84 300,82 S 400,72 450,68 S 550,58 600,60 S 700,46 800,42 L 800,240 Z" fill="url(#warmGrad)" />
                  <path d="M 0,108 C 50,104 100,110 150,98 S 250,84 300,82 S 400,72 450,68 S 550,58 600,60 S 700,46 800,42" fill="none" stroke="#f5b544" strokeWidth="1.6" strokeOpacity="0.7" />
                  <path d="M 0,240 L 0,82 C 50,78 100,86 150,72 S 250,58 300,56 S 400,44 450,42 S 550,28 600,30 S 700,16 800,12 L 800,240 Z" fill="url(#hotGrad)" />
                  <path d="M 0,82 C 50,78 100,86 150,72 S 250,58 300,56 S 400,44 450,42 S 550,28 600,30 S 700,16 800,12" fill="none" stroke="#4ade80" strokeWidth="2" />
                </svg>
              </div>
            )}
            <div className="chart-axis">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Today"].map((d) => (
                <div key={d} className="tick">{d}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Recent activity</div>
              <div className="card-sub">Score events and signal triggers</div>
            </div>
            <div className="card-actions">
              {(["All", "Mine"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActivityTab(t)}
                  className={`card-mini-tab${activityTab === t ? " active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body dense activity-list" style={{ overflowY: "auto", maxHeight: 320 }}>
            {activityRows.length === 0 ? (
              <div style={{ padding: "20px 16px", color: "var(--text-quaternary)", fontSize: 12 }}>
                No recent activity
              </div>
            ) : (
              activityRows.map((row, i) => {
                const bandLower = (row.band ?? "cold").toUpperCase();
                const dotClass =
                  row.type === "autopilot"
                    ? "dot-blue"
                    : bandLower === "HOT"
                    ? "dot-hot"
                    : bandLower === "WARM"
                    ? "dot-warm"
                    : "dot-cold";
                const pillClass =
                  bandLower === "HOT" ? "pill-hot" : bandLower === "WARM" ? "pill-warm" : "pill-cold";
                return (
                  <div key={i} className="activity-row">
                    <div className={`dot ${dotClass}`}>
                      <span className="ring" />
                    </div>
                    <div className="body">
                      <div className="text">
                        {row.type === "autopilot" ? (
                          <>
                            Autopilot fired on <strong>{row.company}</strong>
                            {row.reason && <span> · {row.reason}</span>}
                          </>
                        ) : (
                          <>
                            <strong>{row.company}</strong> scored{" "}
                            <span className={`pill ${pillClass}`}>
                              {bandLower} {row.score}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="meta">
                        {row.type === "score" ? `score ${row.score} · band ${bandLower}` : "autopilot action"}
                      </div>
                    </div>
                    <span className="ts">{relTime(row.createdAt)}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="card-foot">
            <span>Showing {activityRows.length} events</span>
            <Link href="/history">
              View activity log <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Lower grid: movers + pipeline + signals ───────────────────── */}
      <div className="grid-lower">
        {/* Top movers */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Top movers · 7 days</div>
              <div className="card-sub">Biggest score deltas</div>
            </div>
            <div className="card-actions">
              <button
                type="button"
                onClick={() => setMoversTab("Up")}
                className={`card-mini-tab${moversTab === "Up" ? " active" : ""}`}
              >
                ▲ Up
              </button>
              <button
                type="button"
                onClick={() => setMoversTab("Down")}
                className={`card-mini-tab${moversTab === "Down" ? " active" : ""}`}
              >
                ▼ Down
              </button>
            </div>
          </div>
          <div className="movers">
            {movers.length === 0 ? (
              <div style={{ padding: "16px", color: "var(--text-quaternary)", fontSize: 12 }}>No movers yet</div>
            ) : (
              movers.map((m) => (
                <div key={m.n} className="mover-row">
                  <div className={`av ${avClass(m.n)}`}>{m.n[0]}</div>
                  <div className="info">
                    <div className="name">{m.n}</div>
                    <div className="reason">score {m.s}</div>
                  </div>
                  <span className="score">{m.s}</span>
                  <span className={`delta ${m.d > 0 ? "delta-up" : m.d < 0 ? "delta-down" : "delta-flat"}`}>
                    {m.d > 0 ? "▲" : m.d < 0 ? "▼" : "—"} {m.d !== 0 ? Math.abs(m.d) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="card-foot">
            <span>{movers.length} movers</span>
            <Link href="/watchlist">View all <span className="arrow">→</span></Link>
          </div>
        </div>

        {/* Pipeline by band */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Pipeline by band</div>
              <div className="card-sub">{totalTracked} tracked accounts</div>
            </div>
          </div>
          <div className="pipeline-list">
            {pipeline.map((p) => (
              <div key={p.l} className="pipe-row">
                <div className="top">
                  <span className="label">
                    <span
                      className="swatch"
                      style={{ background: p.c, boxShadow: p.glow ? `0 0 6px ${p.c}` : undefined }}
                    />
                    {p.l}
                  </span>
                  <span className="num">
                    {p.n}
                    <span className="pct">{p.pct}%</span>
                  </span>
                </div>
                <div className="pipe-bar">
                  <div className="fill" style={{ width: `${p.pct}%`, background: p.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card-foot">
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-quaternary)" }}>band distribution</span>
            <Link href="/pipeline">Open Intent Hub <span className="arrow">→</span></Link>
          </div>
        </div>

        {/* Signal mix donut */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Signal mix</div>
              <div className="card-sub">Avg contribution across HOT band</div>
            </div>
          </div>
          {signalMix.length === 0 ? (
            <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
              No HOT accounts to analyze
            </div>
          ) : (
            <div className="signals-card">
              <div className="donut">
                <svg viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeDasharray={`${seg.dash} ${circumference}`}
                      strokeDashoffset={seg.offset}
                    />
                  ))}
                </svg>
                <div className="donut-center">
                  <span className="donut-num">{avgHotScore || "—"}</span>
                  <span className="donut-label">avg HOT</span>
                </div>
              </div>
              <div className="signals-legend">
                {signalMix.map((s) => (
                  <div key={s.key} className="row">
                    <span className="swatch" style={{ background: SIGNAL_COLORS[s.key] ?? "var(--text-tertiary)" }} />
                    <span className="name">{s.label}</span>
                    <span className="num">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card-foot">
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-quaternary)" }}>last 7 days</span>
            <Link href="/score">Tune weights <span className="arrow">→</span></Link>
          </div>
        </div>
      </div>

      {/* ── Watchlist heatmap ────────────────────────────────────────── */}
      <div className="card heatmap" style={{ marginBottom: 12 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Watchlist · score snapshot</div>
            <div className="card-sub">{watchlist.length} pinned accounts</div>
          </div>
          <div className="card-actions">
            <Link href="/watchlist" className="card-mini-tab">View all</Link>
          </div>
        </div>
        {watchlist.length === 0 ? (
          <div style={{ padding: "20px 18px", color: "var(--text-quaternary)", fontSize: 12 }}>
            No watchlist items yet —{" "}
            <Link href="/watchlist" style={{ color: "var(--accent-2)" }}>add accounts</Link>
          </div>
        ) : (
          <div className="hm-grid">
            {watchlist.map((w) => (
              <div key={w.n} className={`hm-cell ${w.band}`}>
                <div className="top">
                  <span className="name">{w.n}</span>
                  <span className="score">{w.s}</span>
                </div>
                <div className="spark">
                  <div className="b" style={{ height: "60%" }} />
                  <div className="b" style={{ height: "70%" }} />
                  <div className="b" style={{ height: "65%" }} />
                  <div className="b" style={{ height: "75%" }} />
                  <div className="b" style={{ height: "80%" }} />
                  <div className="b" style={{ height: "85%", background: w.band === "hot" ? "var(--hot)" : w.band === "warm" ? "var(--warm)" : "var(--cold)" }} />
                  <div className="b" style={{ height: `${Math.max(20, w.s)}%`, background: w.band === "hot" ? "var(--hot)" : w.band === "warm" ? "var(--warm)" : "var(--cold)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Autopilot status ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Autopilot · status</div>
            <div className="card-sub">Coming soon</div>
          </div>
        </div>
        <div style={{ padding: "16px", color: "var(--text-tertiary)", fontSize: 13, lineHeight: 1.5 }}>
          Automated workflows that score your watchlist and fire actions when intent signals match.{" "}
          <Link href="/autopilot" style={{ color: "var(--accent-2)" }}>Learn more</Link>
        </div>
        <div className="card-foot">
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-quaternary)" }}>
            Launching after v1
          </span>
          <Link href="/autopilot">View roadmap <span className="arrow">→</span></Link>
        </div>
      </div>
    </div>
  );
}
