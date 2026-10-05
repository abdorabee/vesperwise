"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import type { DbScore, IntentSignalKey, SignalSet } from "@/lib/types";

/** Score delta of a run against the previous run for the same domain. */
export interface RunDelta {
  direction: "up" | "down" | "flat" | "first";
  diff: number;
  from: number;
  prevTime?: string;
}

const S = {
  hero: {
    display: "grid", gridTemplateColumns: "130px 1fr", gap: 18, padding: 16,
    background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", marginBottom: 14,
  } as CSSProperties,
  heroMeta: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" } as CSSProperties,
  actionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 } as CSSProperties,
  card: { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" } as CSSProperties,
  sectionLabel: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, color: "var(--text-tertiary)" } as CSSProperties,
  rule: { flex: 1, height: 1, background: "var(--border-subtle)" } as CSSProperties,
  metaLabel: { fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 } as CSSProperties,
};

export const SIGNAL_META: { key: IntentSignalKey; abbr: string; color: string }[] = [
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

export function urgencyLabel(u: string | null): { label: string; cls: string } {
  if (u === "act-now") return { label: "Strike now", cls: "strike" };
  if (u === "this-week") return { label: "Engage", cls: "engage" };
  return { label: "Nurture", cls: "nurture" };
}

export function stageLabel(s: string | null) {
  if (s === "decision") return "Decision";
  if (s === "consideration") return "Consideration";
  return "Awareness";
}

export function urgencyStyle(u: string | null): CSSProperties {
  const base: CSSProperties = { padding: "1px 7px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 };
  if (u === "act-now") return { ...base, background: "var(--hot-bg)", color: "var(--hot)" };
  if (u === "this-week") return { ...base, background: "var(--warm-bg)", color: "var(--warm)" };
  return { ...base, background: "rgba(223,255,0,0.10)", color: "var(--cyan)" };
}

export function deltaColor(direction: string) {
  if (direction === "up") return "var(--hot)";
  if (direction === "down") return "var(--red)";
  return "var(--text-tertiary)";
}

export function runId(id: string) {
  return id.slice(-4).toUpperCase();
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

function fmtScoredWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `Scored ${date} · ${time}`;
}

function urgencyWindow(u: string | null) {
  if (u === "act-now") return "~2 weeks";
  if (u === "this-week") return "~4 weeks";
  return "~8 weeks";
}

function countFiringSignals(signals: SignalSet | null | undefined) {
  if (!signals) return 0;
  return SIGNAL_META.filter((m) => (signals[m.key]?.score ?? 0) > 0).length;
}

function deltaText(delta: RunDelta | null | undefined) {
  if (!delta || delta.direction === "first") return "—";
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "=";
  return `${arrow} ${delta.diff} from ${delta.from}`;
}

function RunRing({ score, band }: { score: number; band: string }) {
  const r = 55;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const g = band === "HOT" ? ["#4ade80", "#dfff00", "#e8ff40"] : band === "WARM" ? ["#f5b544", "#8a8f98", "#e8ff40"] : ["var(--text-tertiary)", "var(--text-tertiary)", "var(--text-tertiary)"];
  return (
    <div style={{ position: "relative", width: 130, height: 130 }}>
      <svg viewBox="0 0 130 130" style={{ display: "block" }} aria-hidden="true">
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

function CopyIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11" aria-hidden="true"><rect x="2" y="2" width="6" height="8" rx="1" /><path d="M4 4h4" /></svg>;
}

function CopyCard({ label, text, copied, onCopy, mono }: { label: string; text: string; copied: boolean; onCopy: () => void; mono?: boolean }) {
  return (
    <div style={{ ...S.card, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-tertiary)" }}>
        {label}
        <button type="button" aria-label={`Copy ${label.toLowerCase()}`} style={{ cursor: "pointer", color: "var(--text-tertiary)" }} onClick={onCopy}>
          {copied ? "✓" : <CopyIcon />}
        </button>
      </div>
      <div style={{ padding: "10px 12px", fontSize: mono ? 12 : 13, color: mono ? "var(--text-secondary)" : "var(--text-primary)", lineHeight: 1.55, fontFamily: mono ? "var(--font-mono)" : undefined }}>{text}</div>
    </div>
  );
}

function RunHero({ row, delta }: { row: DbScore; delta?: RunDelta | null }) {
  return (
    <div style={S.hero}>
      <RunRing score={row.score} band={row.score_band} />
      <div>
        <div style={S.heroMeta}>
          <div>
            <div style={S.metaLabel}>Stage</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{stageLabel(row.buying_stage)}</div>
          </div>
          <div>
            <div style={S.metaLabel}>Urgency</div>
            <div><span style={urgencyStyle(row.urgency)}>{urgencyLabel(row.urgency).label}</span></div>
          </div>
          <div>
            <div style={S.metaLabel}>Δ vs previous</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: delta ? deltaColor(delta.direction) : "var(--text-tertiary)" }}>{deltaText(delta)}</div>
          </div>
          <div>
            <div style={S.metaLabel}>Window</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{urgencyWindow(row.urgency)}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, fontSize: 11, color: "var(--text-tertiary)" }}>
          <span>{fmtScoredWhen(row.created_at)}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 999 }}>Run #{runId(row.id)}</span>
        </div>
      </div>
    </div>
  );
}

function RunSignals({ signals }: { signals: SignalSet }) {
  return (
    <>
      <div style={S.sectionLabel}>
        <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Key triggers</strong>
        <span style={S.rule} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-quaternary)" }}>{countFiringSignals(signals)} of 4 firing</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {SIGNAL_META.map(({ key, abbr, color }) => {
          const sig = signals[key];
          if (!sig) return null;
          return (
            <div key={key} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", fontSize: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 4, background: color, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>{abbr}</div>
              <div style={{ flex: 1, color: "var(--text-secondary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sig.detail || key}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>{sig.score} / {sig.max}</div>
            </div>
          );
        })}
      </div>
      <div style={S.sectionLabel}>
        <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Account context</strong>
        <span>· excluded from intent score</span>
        <span style={S.rule} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
        {CONTEXT_META.map(({ key, label }) => {
          const signal = signals[key];
          if (!signal) return null;
          return (
            <div key={key} style={{ ...S.card, padding: "8px 10px", fontSize: 12 }}>
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
  );
}

/** Snapshot of one historical score run, shown as a tab in the account panel. */
export function HistoryRunTab({ row, delta, lastScoreHref }: { row: DbScore; delta?: RunDelta | null; lastScoreHref: string }) {
  const [copiedField, setCopiedField] = useState<"subject" | "track" | null>(null);

  function copy(field: "subject" | "track", text: string) {
    void navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div data-slot="history-run-tab">
      <RunHero row={row} delta={delta} />

      {row.ai_summary ? (
        <>
          <div style={S.sectionLabel}>
            <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>AI summary</strong>
            <span style={S.rule} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-quaternary)" }}>{row.model_fallback ? "deterministic fallback" : "schema-validated AI"}</span>
          </div>
          <div style={{ ...S.card, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{row.ai_summary}</div>
        </>
      ) : null}

      {row.why_now || row.recommended_action ? (
        <>
          <div style={S.sectionLabel}>
            <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Why now &amp; recommended action</strong>
            <span style={S.rule} />
          </div>
          <div style={S.actionGrid}>
            {row.why_now ? (
              <div style={{ ...S.card, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Why now</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{row.why_now}</div>
              </div>
            ) : null}
            {row.recommended_action ? (
              <div style={{ background: "rgba(223,255,0,0.08)", border: "1px solid rgba(223,255,0,0.2)", borderRadius: "var(--r-md)", padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Recommended action</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{row.recommended_action}</div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {row.signals ? <RunSignals signals={row.signals} /> : null}

      {row.email_subject || row.talk_track ? (
        <>
          <div style={S.sectionLabel}>
            <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Sales tools</strong>
            <span style={S.rule} />
          </div>
          {row.email_subject ? <CopyCard label="Email subject line" text={row.email_subject} copied={copiedField === "subject"} onCopy={() => copy("subject", row.email_subject!)} /> : null}
          {row.talk_track ? <CopyCard label="Talk track" text={row.talk_track} copied={copiedField === "track"} onCopy={() => copy("track", row.talk_track!)} mono /> : null}
        </>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
          Run <strong style={{ color: "var(--text-secondary)", fontWeight: 500 }}>#{runId(row.id)}</strong> · {row.scoring_version} · 6h personalized cache
        </div>
        <Link href={lastScoreHref} className="btn-primary">Open in Score</Link>
      </div>
    </div>
  );
}
