"use client";
import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toCSV, downloadCSV as triggerDownload, csvFilename, formatSignal } from "@/lib/csv";
import type { DbScore, IntentSignalKey, ScoreBand, SignalSet } from "@/lib/types";
import type { HistoryStats, ActivityBucket } from "./page";

interface HistoryViewProps { stats: HistoryStats; }

const HT_GRID = "70px minmax(180px,1.2fr) 60px 70px 220px 1fr 90px 60px";

const S = {
  activityStrip: {
    background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
    padding: "14px 18px", marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1px 220px",
    gap: 18, alignItems: "stretch",
  } as CSSProperties,
  statStrip: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 } as CSSProperties,
  statCard: {
    background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "14px 18px",
  } as CSSProperties,
  statLabel: { fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8, letterSpacing: "-0.006em" } as CSSProperties,
  statNum: {
    fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.032em",
    lineHeight: 1, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums",
  } as CSSProperties,
  statDelta: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--hot)", marginTop: 6 } as CSSProperties,
  toolsRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" } as CSSProperties,
  searchInput: {
    display: "flex", alignItems: "center", gap: 8, background: "var(--bg-elevated)",
    border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "6px 12px",
    width: 320, fontSize: 13, color: "var(--text-primary)",
  } as CSSProperties,
  histTable: {
    background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
    overflow: "hidden", minWidth: 860,
  } as CSSProperties,
  htHead: {
    display: "grid", gridTemplateColumns: HT_GRID, gap: 14, padding: "0 16px", height: 34,
    alignItems: "center", fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)",
    background: "rgba(255,255,255,0.01)",
  } as CSSProperties,
  htRow: (open: boolean) => ({
    display: "grid", gridTemplateColumns: HT_GRID, gap: 14, padding: "0 16px", minHeight: 58,
    alignItems: "center", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer",
    background: open ? "rgba(223,255,0,0.06)" : undefined,
  }) as CSSProperties,
  htTime: { fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", letterSpacing: "0.02em", lineHeight: 1.4 } as CSSProperties,
  htAgo: { display: "block", fontSize: 10, color: "var(--text-quaternary)", marginTop: 1 } as CSSProperties,
  htCo: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 } as CSSProperties,
  htName: {
    fontSize: 14, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.011em",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  } as CSSProperties,
  htDomain: {
    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  } as CSSProperties,
  htScore: {
    fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.034em",
    fontVariantNumeric: "tabular-nums", lineHeight: 1, display: "flex", alignItems: "baseline", gap: 6,
  } as CSSProperties,
  htScoreOf: { fontSize: 11, fontWeight: 500, color: "var(--text-quaternary)" } as CSSProperties,
  htSummary: {
    fontSize: 12, color: "var(--text-secondary)", letterSpacing: "-0.006em", lineHeight: 1.45,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  } as CSSProperties,
  htFoot: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px", borderTop: "1px solid var(--border-subtle)",
    fontSize: 12, color: "var(--text-tertiary)",
  } as CSSProperties,
  dateGroup: {
    display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)",
    fontWeight: 500, margin: "16px 0 6px", padding: "0 4px",
  } as CSSProperties,
  drawerHero: {
    display: "grid", gridTemplateColumns: "130px 1fr", gap: 18, padding: 16,
    background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", marginBottom: 14,
  } as CSSProperties,
  dheroMeta: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" } as CSSProperties,
  actionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 } as CSSProperties,
};

const AV_COLORS = [
  "linear-gradient(135deg,#dfff00,#dfff00)",
  "linear-gradient(135deg,#4ade80,#22c55e)",
  "linear-gradient(135deg,#f5b544,#8a8f98)",
  "linear-gradient(135deg,#e8ff40,#dfff00)",
  "linear-gradient(135deg,#f87171,#f5b544)",
  "linear-gradient(135deg,#dfff00,#4ade80)",
  "linear-gradient(135deg,#dfff00,#dfff00)",
  "linear-gradient(135deg,#8a8f98,#f87171)",
];

const SIGNAL_META: { key: IntentSignalKey; abbr: string; color: string }[] = [
  { key: "funding", abbr: "FU", color: "#f5b544" },
  { key: "hiring", abbr: "HI", color: "#4ade80" },
  { key: "news", abbr: "NE", color: "#8a8f98" },
  { key: "technology", abbr: "TE", color: "#e8ff40" },
  { key: "web_activity", abbr: "WA", color: "#a855f7" },
];

const CONTEXT_META = [
  { key: "web" as const, label: "Web authority" },
  { key: "github" as const, label: "GitHub activity" },
];

function avColor(name: string) { return AV_COLORS[(name?.charCodeAt(0) ?? 0) % AV_COLORS.length]; }

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function fmtRowTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, now) || sameDay(d, yesterday)) return time;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${date} · ${time}`;
}

function fmtScoredWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `Scored ${date} · ${time}`;
}

function getDateGroupKey(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (sameDay(d, now)) {
    return `Today · ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  }
  if (sameDay(d, yesterday)) {
    return `Yesterday · ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  }
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  if (d >= weekStart) return "Earlier this week";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function computeDeltas(rows: DbScore[]): Map<string, { direction: "up" | "down" | "flat" | "first"; diff: number; from: number; prevTime?: string }> {
  const result = new Map<string, { direction: "up" | "down" | "flat" | "first"; diff: number; from: number; prevTime?: string }>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prevIdx = rows.findIndex((r, idx) => idx > i && r.domain === row.domain);
    if (prevIdx === -1) {
      result.set(row.id, { direction: "first", diff: 0, from: 0 });
    } else {
      const prev = rows[prevIdx];
      const diff = row.score - prev.score;
      result.set(row.id, {
        direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
        diff: Math.abs(diff),
        from: prev.score,
        prevTime: prev.created_at,
      });
    }
  }
  return result;
}

function urgencyLabel(u: string | null): { label: string; cls: string } {
  if (u === "act-now") return { label: "Strike now", cls: "strike" };
  if (u === "this-week") return { label: "Engage", cls: "engage" };
  return { label: "Nurture", cls: "nurture" };
}

function stageLabel(s: string | null) {
  if (s === "decision") return "Decision";
  if (s === "consideration") return "Consideration";
  return "Awareness";
}

function stageSwatch(s: string | null) {
  if (s === "decision") return "var(--hot)";
  if (s === "consideration") return "var(--warm)";
  return "transparent";
}

function bandColor(band: string) {
  if (band === "HOT") return "var(--hot)";
  if (band === "WARM") return "var(--warm)";
  return "var(--cold)";
}

function urgencyStyle(u: string | null): CSSProperties {
  const base: CSSProperties = { padding: "1px 7px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 };
  if (u === "act-now") return { ...base, background: "var(--hot-bg)", color: "var(--hot)" };
  if (u === "this-week") return { ...base, background: "var(--warm-bg)", color: "var(--warm)" };
  return { ...base, background: "rgba(223,255,0,0.10)", color: "var(--cyan)" };
}

function bandChipStyle(band: "hot" | "warm" | "cold", inactive: boolean): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999,
    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.02em",
    cursor: "pointer", border: "1px solid transparent", opacity: inactive ? 0.45 : 1,
  };
  if (band === "hot") return { ...base, background: "var(--hot-bg)", borderColor: "var(--hot-border)", color: "var(--hot)" };
  if (band === "warm") return { ...base, background: "var(--warm-bg)", borderColor: "var(--warm-border)", color: "var(--warm)" };
  return { ...base, background: "var(--cold-bg)", borderColor: "var(--cold-border)", color: "var(--text-secondary)" };
}

function bandDotStyle(band: "hot" | "warm" | "cold"): CSSProperties {
  const base: CSSProperties = { width: 6, height: 6, borderRadius: 999, display: "inline-block", flexShrink: 0 };
  if (band === "hot") return { ...base, background: "var(--hot)", boxShadow: "0 0 4px var(--hot)" };
  if (band === "warm") return { ...base, background: "var(--warm)" };
  return { ...base, background: "var(--cold)" };
}

function htBandStyle(band: string): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 999,
    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
  };
  if (band === "HOT") return { ...base, background: "var(--hot-bg)", border: "1px solid var(--hot-border)", color: "var(--hot)" };
  if (band === "WARM") return { ...base, background: "var(--warm-bg)", border: "1px solid var(--warm-border)", color: "var(--warm)" };
  return { ...base, background: "var(--cold-bg)", border: "1px solid var(--cold-border)", color: "var(--text-secondary)" };
}

function htBandDotStyle(band: string): CSSProperties {
  if (band === "HOT") return { width: 5, height: 5, borderRadius: 999, background: "var(--hot)", boxShadow: "0 0 4px var(--hot)", display: "inline-block" };
  if (band === "WARM") return { width: 5, height: 5, borderRadius: 999, background: "var(--warm)", display: "inline-block" };
  return { width: 5, height: 5, borderRadius: 999, background: "var(--cold)", display: "inline-block" };
}

function deltaColor(direction: string) {
  if (direction === "up") return "var(--hot)";
  if (direction === "down") return "var(--red)";
  return "var(--text-tertiary)";
}

function urgencyWindow(u: string | null) {
  if (u === "act-now") return "~2 weeks";
  if (u === "this-week") return "~4 weeks";
  return "~8 weeks";
}

function runId(id: string) {
  return id.slice(-4).toUpperCase();
}

function countFiringSignals(signals: SignalSet | null | undefined) {
  if (!signals) return 0;
  return SIGNAL_META.filter(m => (signals[m.key]?.score ?? 0) > 0).length;
}

function DrawerRing({ score, band }: { score: number; band: string }) {
  const r = 55;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const g = band === "HOT" ? ["#4ade80", "#dfff00", "#e8ff40"] : band === "WARM" ? ["#f5b544", "#8a8f98", "#e8ff40"] : ["var(--text-tertiary)", "var(--text-tertiary)", "var(--text-tertiary)"];
  return (
    <div style={{ position: "relative", width: 130, height: 130 }}>
      <svg viewBox="0 0 130 130" style={{ display: "block" }}>
        <defs>
          <linearGradient id="dRingGrad" x1="0" y1="0" x2="130" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={g[0]} />
            <stop offset="55%" stopColor={g[1]} />
            <stop offset="100%" stopColor={g[2]} />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
        <circle cx="65" cy="65" r={r} stroke="url(#dRingGrad)" strokeWidth="8" fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "65px 65px" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.034em", color: "var(--text-primary)", lineHeight: 1 }}>{score}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-quaternary)", marginTop: 2 }}>/ 100</div>
        <div style={{ ...htBandStyle(band), marginTop: 6, fontSize: 9 }}>
          <span style={htBandDotStyle(band)} />{band}
        </div>
      </div>
    </div>
  );
}

export function HistoryView({ stats }: HistoryViewProps) {
  const [rows, setRows] = useState<DbScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [bandFilter, setBandFilter] = useState<ScoreBand | null>(null);
  const [drawerRow, setDrawerRow] = useState<DbScore | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

  const fetchScores = useCallback(async (p: number, q: string, band: ScoreBand | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (band) params.set("band", band);
      const res = await fetch(`/api/dashboard/scores?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.scores ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchScores(page, query, bandFilter); }, [fetchScores, page, query, bandFilter]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function handleSearch(val: string) { setQuery(val); setPage(1); }
  function handleBandFilter(band: ScoreBand | null) { setBandFilter(b => b === band ? null : band); setPage(1); }

  function exportCSV() {
    const columns = [
      { key: "company_name", label: "Company" },
      { key: "domain", label: "Domain" },
      { key: "score", label: "Intent Score" },
      { key: "score_band", label: "Score Band" },
      { key: "score_status", label: "Score Status" },
      { key: "data_coverage", label: "Data Coverage" },
      { key: "icp_fit_score", label: "ICP Fit Score" },
      { key: "scoring_version", label: "Scoring Version" },
      { key: "buying_stage", label: "Buying Stage" },
      { key: "urgency", label: "Urgency" },
      { key: "ai_summary", label: "AI Summary" },
      { key: "why_now", label: "Why Now" },
      { key: "recommended_action", label: "Recommended Action" },
      { key: "key_triggers", label: "Key Triggers" },
      { key: "email_subject", label: "Email Subject" },
      { key: "talk_track", label: "Talk Track" },
      { key: "funding_signal", label: "Funding Signal" },
      { key: "hiring_signal", label: "Hiring Signal" },
      { key: "news_signal", label: "News Signal" },
      { key: "technology_signal", label: "Technology Signal" },
      { key: "web_context", label: "Web Context" },
      { key: "github_context", label: "GitHub Context" },
      { key: "scored_at", label: "Scored At" },
    ];
    const csvRows = rows.map((r) => ({
      company_name: r.company_name, domain: r.domain, score: r.score,
      score_band: r.score_band, score_status: r.score_status,
      data_coverage: r.data_coverage == null ? "" : `${Math.round(r.data_coverage * 100)}%`,
      icp_fit_score: r.icp_fit_score ?? "", scoring_version: r.scoring_version,
      buying_stage: r.buying_stage ?? "",
      urgency: r.urgency ?? "", ai_summary: r.ai_summary ?? "",
      why_now: r.why_now ?? "", recommended_action: r.recommended_action ?? "",
      key_triggers: (r.key_triggers ?? []).join("; "),
      email_subject: r.email_subject ?? "", talk_track: r.talk_track ?? "",
      funding_signal: r.signals ? formatSignal(r.signals.funding) : "",
      hiring_signal: r.signals ? formatSignal(r.signals.hiring) : "",
      news_signal: r.signals ? formatSignal(r.signals.news) : "",
      technology_signal: r.signals ? formatSignal(r.signals.technology) : "",
      web_context: r.signals ? formatSignal(r.signals.web) : "",
      github_context: r.signals ? formatSignal(r.signals.github) : "",
      scored_at: new Date(r.created_at).toISOString(),
    }));
    triggerDownload(toCSV(columns, csvRows), csvFilename("vesperwise-history"));
  }

  const maxBucketTotal = Math.max(...stats.activityData.map(b => b.hot + b.warm + b.cold), 1);
  const priorDelta = stats.monthlyCount - stats.priorMonthCount;

  function ActivityBarScaled({ bucket, isToday }: { bucket: ActivityBucket; isToday: boolean }) {
    const scale = 60 / maxBucketTotal;
    const hotH = bucket.hot > 0 ? Math.max(1, Math.round(bucket.hot * scale)) : 0;
    const warmH = bucket.warm > 0 ? Math.max(1, Math.round(bucket.warm * scale)) : 0;
    const coldH = bucket.cold > 0 ? Math.max(1, Math.round(bucket.cold * scale)) : 0;
    return (
      <div title={`${bucket.date}: ${bucket.hot + bucket.warm + bucket.cold} scored`}
        style={{ display: "flex", flexDirection: "column-reverse", gap: 1, height: "100%", justifyContent: "flex-start", position: "relative", cursor: "pointer" }}>
        {bucket.cold > 0 && <span style={{ display: "block", width: "100%", borderRadius: 1, height: coldH, background: "var(--cold)", opacity: 0.55 }} />}
        {bucket.warm > 0 && <span style={{ display: "block", width: "100%", borderRadius: 1, height: warmH, background: "var(--warm)" }} />}
        {bucket.hot > 0 && <span style={{ display: "block", width: "100%", borderRadius: 1, height: hotH, background: "var(--hot)" }} />}
        {isToday && (
          <span style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: 999, background: "var(--text-primary)" }} />
        )}
      </div>
    );
  }

  const groupedRows = rows.reduce<{ dateKey: string; rows: DbScore[] }[]>((acc, row) => {
    const dk = getDateGroupKey(row.created_at);
    const last = acc[acc.length - 1];
    if (last && last.dateKey === dk) last.rows.push(row);
    else acc.push({ dateKey: dk, rows: [row] });
    return acc;
  }, []);

  const deltas = computeDeltas(rows);
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const drawerDelta = drawerRow ? deltas.get(drawerRow.id) : null;

  return (
    <div className="hist-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Score history</h1>
          <div className="page-sub">
            Every account you&apos;ve scored —{" "}
            <span className="mono" style={{ color: "var(--text-secondary)" }}>{stats.totalCount.toLocaleString()}</span> runs
            {stats.lastScoredAt && (
              <> · last scored <span className="mono" style={{ color: "var(--text-secondary)" }}>{relTime(stats.lastScoredAt)}</span></>
            )}
          </div>
        </div>
        <div className="page-actions">
          <div className="range-tabs">
            {(["24H", "7D", "30D", "90D", "All"] as const).map(r => (
              <span key={r} className={`range-tab${r === "30D" ? " active" : ""}`}>{r}</span>
            ))}
          </div>
          <button className="tb-btn outlined" onClick={exportCSV} disabled={rows.length === 0}>
            <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="8" height="6" /><path d="M2 5h8" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="activity-strip" style={S.activityStrip}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.034em", lineHeight: 1, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {stats.monthlyCount}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", letterSpacing: "-0.006em" }}>scored in last 30 days</div>
            {priorDelta > 0 && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--hot)", marginLeft: 4 }}>
                ▲ {priorDelta} vs prior
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "inline-flex", gap: 12, fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--hot)", display: "inline-block" }} />HOT</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--warm)", display: "inline-block" }} />WARM</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--cold)", opacity: 0.7, display: "inline-block" }} />COLD</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(30, 1fr)", gap: 3, alignItems: "end", height: 64 }}>
            {stats.activityData.map((b, i) => (
              <ActivityBarScaled key={i} bucket={b} isToday={b.date === today} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-quaternary)", letterSpacing: "0.04em", marginTop: 10 }}>
            <span>{stats.activityData[0]?.date}</span>
            <span>{stats.activityData[7]?.date}</span>
            <span>{stats.activityData[14]?.date}</span>
            <span>{stats.activityData[21]?.date}</span>
            <span>Today</span>
          </div>
        </div>
        <div style={{ background: "var(--border-subtle)", width: 1 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 12 }}>
          {[
            { label: "HOT (≥75)", color: "var(--hot)", count: stats.hotCount, isRescores: false },
            { label: "WARM (50–74)", color: "var(--warm)", count: stats.warmCount, isRescores: false },
            { label: "COLD (<50)", color: "var(--cold)", count: stats.coldCount, isRescores: false },
            { label: "Re-scores", color: "var(--text-tertiary)", count: stats.rescoreCount, isRescores: true },
          ].map(({ label, color, count, isRescores }, idx) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderTop: idx > 0 ? "1px solid var(--border-subtle)" : undefined }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: isRescores ? "var(--text-tertiary)" : "var(--text-secondary)", letterSpacing: "-0.006em" }}>
                {!isRescores && <span style={{ width: 7, height: 7, borderRadius: 999, background: color, boxShadow: `0 0 4px ${color}`, display: "inline-block", flexShrink: 0 }} />}
                {label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {count}
                {stats.monthlyCount > 0 && (
                  <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                    {Math.round(count / stats.monthlyCount * 100 * 10) / 10}%
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.statStrip}>
        {[
          { label: "Total runs", num: stats.totalCount.toLocaleString(), delta: `▲ ${stats.monthlyCount} this month`, hot: false, flat: false },
          { label: "Avg score", num: stats.avgScore || "—", delta: null, hot: false, flat: false },
          { label: "Bands flipped to HOT", num: String(stats.flippedToHot), delta: "last 7 days", hot: true, flat: false },
          { label: "Credits used (30d)", num: String(stats.monthlyCount), delta: `≈ ${Math.round(stats.monthlyCount / 30)}/day pace`, hot: false, flat: true },
        ].map(({ label, num, delta, hot, flat }) => (
          <div key={label} style={S.statCard}>
            <div style={S.statLabel}>{label}</div>
            <div style={{ ...S.statNum, ...(hot ? { color: "var(--hot)" } : {}) }}>{num}</div>
            {delta && <div style={{ ...S.statDelta, ...(flat ? { color: "var(--text-tertiary)" } : {}) }}>{delta}</div>}
          </div>
        ))}
      </div>

      <div style={S.toolsRow}>
        <div style={S.searchInput}>
          <svg style={{ width: 12, height: 12, color: "var(--text-tertiary)", flexShrink: 0 }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="3" /><path d="M7 7l3 3" /></svg>
          <input
            type="text"
            placeholder="Search company, domain, trigger keyword…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text-primary)", letterSpacing: "-0.006em" }}
          />
        </div>
        {(["HOT", "WARM", "COLD"] as const).map(band => {
          const cls = band.toLowerCase() as "hot" | "warm" | "cold";
          const count = band === "HOT" ? stats.hotCount : band === "WARM" ? stats.warmCount : stats.coldCount;
          const inactive = bandFilter !== null && bandFilter !== band;
          return (
            <span key={band} style={bandChipStyle(cls, inactive)} onClick={() => handleBandFilter(band)}>
              <span style={bandDotStyle(cls)} />{band} {count}
            </span>
          );
        })}
        <div style={{ flex: 1 }} />
        <button className="tb-btn outlined">
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="3" height="3" /><rect x="7" y="2" width="3" height="3" /><rect x="2" y="7" width="3" height="3" /><rect x="7" y="7" width="3" height="3" /></svg>
          Stage
        </button>
        <button className="tb-btn outlined">
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h8M4 3h4M5 9h2" /></svg>
          Filter
        </button>
        <button className="tb-btn outlined">Sort: Newest</button>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
          {query ? "No results match your search." : "No scores yet. Use Score to score your first company."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={S.histTable}>
            <div style={S.htHead}>
              <div>Time</div><div>Company</div><div>Score</div><div>Band</div>
              <div>Stage · Urgency</div><div>Key triggers · AI summary</div>
              <div style={{ textAlign: "right" }}>Δ vs prev</div><div />
            </div>

            {groupedRows.map(({ dateKey, rows: groupRows }) => (
              <div key={dateKey}>
                <div style={S.dateGroup}>
                  {dateKey}
                  <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                  <span style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", padding: "1px 7px", borderRadius: 999, fontSize: 10 }}>
                    {groupRows.length} run{groupRows.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {groupRows.map(row => {
                  const delta = deltas.get(row.id) ?? { direction: "first" as const, diff: 0, from: 0 };
                  const isOpen = drawerRow?.id === row.id && drawerOpen;
                  const scoreColor = bandColor(row.score_band);
                  const urg = urgencyLabel(row.urgency);
                  const flatSameDay = delta.direction === "flat" && delta.prevTime && sameDay(new Date(row.created_at), new Date(delta.prevTime));
                  return (
                    <div key={row.id} style={S.htRow(isOpen)}
                      onClick={() => { setDrawerRow(row); setDrawerOpen(true); }}>
                      <div style={S.htTime}>
                        {fmtRowTime(row.created_at)}
                        <span style={S.htAgo}>{relTime(row.created_at)}</span>
                      </div>
                      <div style={S.htCo}>
                        <div style={{ background: avColor(row.company_name), width: 28, height: 28, borderRadius: 6, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>
                          {row.company_name[0]}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={S.htName}>{row.company_name}</div>
                          <div style={S.htDomain}>{row.domain}</div>
                        </div>
                      </div>
                      <div style={{ ...S.htScore, color: scoreColor }}>
                        {row.score}<span style={S.htScoreOf}>/100</span>
                      </div>
                      <div>
                        <span style={htBandStyle(row.score_band)}>
                          <span style={htBandDotStyle(row.score_band)} />{row.score_band}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 11 }}>
                            <span style={{ width: 5, height: 5, borderRadius: 999, background: stageSwatch(row.buying_stage), display: "inline-block" }} />
                            {stageLabel(row.buying_stage)}
                          </span>
                          <span style={urgencyStyle(row.urgency)}>{urg.label}</span>
                        </div>
                        {(row.key_triggers ?? []).length > 0 && (
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--text-quaternary)", flexShrink: 0 }} />
                            {row.key_triggers![0].slice(0, 40)}
                            {row.key_triggers!.length > 1 && (
                              <span style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-tertiary)", padding: "1px 5px", borderRadius: 3, fontSize: 10, flexShrink: 0 }}>
                                +{row.key_triggers!.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={S.htSummary}>{row.ai_summary}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, color: deltaColor(delta.direction) }}>
                        {delta.direction === "first" ? (
                          <>
                            <span>—</span>
                            <span style={{ fontSize: 10, color: "var(--accent-2)", letterSpacing: "0.02em", fontWeight: 400 }}>first run</span>
                          </>
                        ) : (
                          <>
                            <span>{delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "="} {delta.diff}</span>
                            <span style={{ fontSize: 10, color: "var(--text-quaternary)", letterSpacing: "0.02em", fontWeight: 400 }}>
                              {flatSameDay && delta.prevTime
                                ? `vs ${new Date(delta.prevTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                                : `from ${delta.from}`}
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", color: "var(--text-tertiary)", cursor: "pointer" }} title="Re-score" onClick={() => router.push(`/score?domain=${row.domain}`)}>
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M2 6a4 4 0 018-1M10 6a4 4 0 01-8 1M8 3v2h2M4 9V7H2" /></svg>
                        </div>
                        <div style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", color: "var(--text-tertiary)", cursor: "pointer" }}>
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><circle cx="3" cy="6" r="1" /><circle cx="6" cy="6" r="1" /><circle cx="9" cy="6" r="1" /></svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={S.htFoot}>
              <span>Showing {rows.length} of {total} runs</span>
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 4, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</div>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                    <div key={n} style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 4, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: page === n ? "var(--text-primary)" : "var(--text-tertiary)", background: page === n ? "rgba(255,255,255,0.08)" : undefined }} onClick={() => setPage(n)}>{n}</div>
                  ))}
                  <div style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 4, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`drawer-mask${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />

      <div className={`drawer${drawerOpen ? " open" : ""}`}>
        {drawerRow && (
          <>
            <div className="drawer-head" style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 12, alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ background: avColor(drawerRow.company_name), width: 40, height: 40, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, color: "var(--bg)" }}>
                {drawerRow.company_name[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.022em" }}>{drawerRow.company_name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>{drawerRow.domain}</div>
              </div>
              <div style={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", color: "var(--text-tertiary)", cursor: "pointer" }} onClick={() => setDrawerOpen(false)}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14"><path d="M3 3l8 8M11 3l-8 8" /></svg>
              </div>
            </div>

            <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "18px 22px 24px" }}>
              <div style={S.drawerHero}>
                <DrawerRing score={drawerRow.score} band={drawerRow.score_band} />
                <div>
                  <div style={S.dheroMeta}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Stage</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{stageLabel(drawerRow.buying_stage)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Urgency</div>
                      <div><span style={urgencyStyle(drawerRow.urgency)}>{urgencyLabel(drawerRow.urgency).label}</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Δ vs previous</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: drawerDelta ? deltaColor(drawerDelta.direction) : "var(--text-tertiary)" }}>
                        {!drawerDelta || drawerDelta.direction === "first"
                          ? "—"
                          : `${drawerDelta.direction === "up" ? "▲" : drawerDelta.direction === "down" ? "▼" : "="} ${drawerDelta.diff} from ${drawerDelta.from}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Window</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{urgencyWindow(drawerRow.urgency)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span>{fmtScoredWhen(drawerRow.created_at)}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 999 }}>
                      Run #{runId(drawerRow.id)}
                    </span>
                  </div>
                </div>
              </div>

              {drawerRow.ai_summary && (
                <>
                  <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent-2)", display: "inline-block" }} />
                    <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>AI summary</strong>
                    <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-quaternary)" }}>
                      {drawerRow.model_fallback ? "deterministic fallback" : "schema-validated AI"}
                    </span>
                  </div>
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--accent-2)", display: "inline-block" }} />
                      Generated by VesperWise
                    </div>
                    {drawerRow.ai_summary}
                  </div>
                </>
              )}

              {(drawerRow.why_now || drawerRow.recommended_action) && (
                <>
                  <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--warm)", boxShadow: "0 0 4px var(--warm)", display: "inline-block" }} />
                    <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Why now &amp; recommended action</strong>
                    <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                  </div>
                  <div style={S.actionGrid}>
                    {drawerRow.why_now && (
                      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Why now</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{drawerRow.why_now}</div>
                      </div>
                    )}
                    {drawerRow.recommended_action && (
                      <div style={{ background: "rgba(223,255,0,0.08)", border: "1px solid rgba(223,255,0,0.2)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Recommended action</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{drawerRow.recommended_action}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {drawerRow.signals && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--hot)", boxShadow: "0 0 4px var(--hot)", display: "inline-block" }} />
                    <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Key triggers</strong>
                    <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-quaternary)" }}>
                      {countFiringSignals(drawerRow.signals)} of 4 firing
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {SIGNAL_META.map(({ key, abbr, color }) => {
                      const sig = drawerRow.signals[key];
                      if (!sig) return null;
                      return (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", fontSize: 12 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 4, background: color, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>{abbr}</div>
                          <div style={{ flex: 1, color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sig.detail || key}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>{sig.score} / {sig.max}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Account context</strong>
                    <span>· excluded from intent score</span>
                    <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    {CONTEXT_META.map(({ key, label }) => {
                      const signal = drawerRow.signals[key];
                      return (
                        <div key={key} style={{ padding: "8px 10px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", fontSize: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                            <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{label}</strong>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{signal.score}/{signal.max}</span>
                          </div>
                          <div style={{ color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{signal.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {(drawerRow.email_subject || drawerRow.talk_track) && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent-2)", display: "inline-block" }} />
                    <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Sales tools</strong>
                    <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
                  </div>
                  {drawerRow.email_subject && (
                    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", marginBottom: 8, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-tertiary)" }}>
                        Email subject line
                        <div style={{ cursor: "pointer", color: "var(--text-tertiary)" }} onClick={() => { navigator.clipboard.writeText(drawerRow.email_subject!); setCopiedField("subject"); setTimeout(() => setCopiedField(null), 2000); }}>
                          {copiedField === "subject" ? "✓" : (
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><rect x="2" y="2" width="6" height="8" rx="1" /><path d="M4 4h4" /></svg>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-primary)" }}>{drawerRow.email_subject}</div>
                    </div>
                  )}
                  {drawerRow.talk_track && (
                    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-tertiary)" }}>
                        Talk track
                        <div style={{ cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText(drawerRow.talk_track!); setCopiedField("track"); setTimeout(() => setCopiedField(null), 2000); }}>
                          {copiedField === "track" ? "✓" : (
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><rect x="2" y="2" width="6" height="8" rx="1" /><path d="M4 4h4" /></svg>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, fontFamily: "var(--font-mono)" }}>{drawerRow.talk_track}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="drawer-foot" style={{ display: "flex", gap: 8, alignItems: "center", padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
                Run <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>#{runId(drawerRow.id)}</strong> · {drawerRow.scoring_version} · 6h personalized cache
              </div>
              <button className="tb-btn outlined" onClick={() => { setDrawerOpen(false); router.push(`/score?domain=${drawerRow.domain}`); }}>
                <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6a4 4 0 018-1M10 6a4 4 0 01-8 1M8 3v2h2M4 9V7H2" /></svg>
                Re-score
              </button>
              <button className="btn-primary" onClick={() => router.push(`/score?domain=${drawerRow.domain}`)}>
                Open account
                <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h6M6 3l3 3-3 3" /></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
