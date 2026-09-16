"use client";

import { useId } from "react";
import type { ScoreBand, SignalSet } from "@/lib/types";

export type ScoreCardData = {
  company: string;
  domain: string;
  intent_score: number;
  score_band: ScoreBand;
  ai_summary?: string;
  recommended_action?: string;
  buying_stage?: string;
  urgency?: string;
  why_now?: string;
  data_coverage?: number;
  score_status?: string;
  icp_fit_score?: number | null;
  confidence?: number;
  email_subject?: string;
  talk_track?: string;
  signals?: SignalSet;
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
  "linear-gradient(135deg,#a78bfa,#e8ff40)",
  "linear-gradient(135deg,#f5b544,#4ade80)",
];

export function avColor(name: string): string {
  return AV_COLORS[(name.charCodeAt(0) ?? 0) % AV_COLORS.length];
}

export function bandClass(band: string | null): string {
  if (band === "HOT") return "band-hot";
  if (band === "WARM") return "band-warm";
  return "band-cold";
}

export function ScoreRing({ score, band }: { score: number; band: string }) {
  const gradId = useId().replace(/:/g, "");
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const gradColors =
    band === "HOT"
      ? ["#4ade80", "#dfff00", "#e8ff40"]
      : band === "WARM"
      ? ["#f5b544", "#8a8f98", "#e8ff40"]
      : ["var(--text-tertiary)", "var(--text-tertiary)", "var(--text-tertiary)"];

  return (
    <div className="score-ring">
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={gradColors[0]} />
            <stop offset="55%" stopColor={gradColors[1]} />
            <stop offset="100%" stopColor={gradColors[2]} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} stroke="var(--border)" strokeWidth="6" fill="none" />
        <circle
          cx="50" cy="50" r={r}
          stroke={`url(#${gradId})`} strokeWidth="6" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div className="score-ring-center">
        <span className={`score-ring-band ${bandClass(band)}`}>
          <span className="dot" />{band}
        </span>
        <div className="score-ring-num">{score}</div>
        <div className="score-ring-of">/ 100</div>
      </div>
    </div>
  );
}

function ResultHead({
  result,
  onWatchlist,
  watchlistAdded,
  watchlistAdding,
}: {
  result: ScoreCardData;
  onWatchlist?: () => void;
  watchlistAdded?: boolean;
  watchlistAdding?: boolean;
}) {
  return (
    <div className="result-head">
      <div className="result-avatar" style={{ background: avColor(result.company) }}>
        {result.company[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="result-title-row">
          <span className="result-id">IQ-{result.domain.slice(-4).toUpperCase()}</span>
          <span className={`band ${bandClass(result.score_band)}`}>
            <span className="dot" />{result.score_band}
          </span>
          <span className="result-title">{result.company}</span>
        </div>
        <div className="result-meta">
          <span style={{ color: "var(--text-secondary)" }}>{result.domain}</span>
          {result.buying_stage && (
            <>
              <span className="dot" />
              <span>{result.buying_stage}</span>
            </>
          )}
          {result.urgency && (
            <>
              <span className="dot" />
              <span>Urgency: {result.urgency}</span>
            </>
          )}
          {result.data_coverage != null && (
            <>
              <span className="dot" />
              <span>Coverage: {Math.round(result.data_coverage * 100)}%{result.score_status ? ` (${result.score_status})` : ""}</span>
            </>
          )}
          {result.icp_fit_score !== undefined && (
            <>
              <span className="dot" />
              <span>{result.icp_fit_score == null ? "ICP fit unavailable" : `ICP fit: ${result.icp_fit_score}%`}</span>
            </>
          )}
        </div>
      </div>
      <div className="result-actions">
        {onWatchlist && (
          <button
            type="button"
            className="tb-btn outlined"
            onClick={onWatchlist}
            disabled={watchlistAdding || watchlistAdded}
          >
            {watchlistAdded ? "Watching ✓" : watchlistAdding ? "Adding…" : "Save to list"}
          </button>
        )}
        <a
          className="tb-btn outlined"
          href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(result.company)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open account →
        </a>
      </div>
    </div>
  );
}

function OverviewBlock({ result }: { result: ScoreCardData }) {
  if (!result.ai_summary) return <ScoreRing score={result.intent_score} band={result.score_band} />;
  return (
    <div className="overview-block">
      <ScoreRing score={result.intent_score} band={result.score_band} />
      <div className="thesis-block">
        <div className="thesis-head">
          <span className="ic" />
          AI thesis
        </div>
        <div className="thesis-text">{result.ai_summary}</div>
        <div className="thesis-meta">
          <span>Generated just now</span>
          {result.confidence != null && (
            <>
              <span className="dot" />
              <span>Confidence {result.confidence.toFixed(2)}</span>
            </>
          )}
          {result.urgency && (
            <>
              <span className="dot" />
              <span>Urgency: {result.urgency}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SIGNAL_CONFIG = [
  { key: "funding"    as const, label: "Funding", color: "#dfff00", grad: "linear-gradient(90deg,#dfff00,#38a3b3)" },
  { key: "hiring"     as const, label: "Hiring",  color: "#4ade80", grad: "linear-gradient(90deg,#4ade80,#22c55e)" },
  { key: "news"       as const, label: "News",    color: "#f5b544", grad: "linear-gradient(90deg,#f5b544,#d49530)" },
  { key: "technology" as const, label: "Tech",    color: "#e8ff40", grad: "linear-gradient(90deg,#e8ff40,#dfff00)" },
];

const CONTEXT_CONFIG = [
  { key: "web" as const, label: "Web authority", color: "#8a8f98" },
  { key: "github" as const, label: "GitHub activity", color: "#a78bfa" },
];

function SignalGrid({ signals }: { signals: SignalSet }) {
  return (
    <>
      <div className="section-label">
        <span className="ic" />
        <strong>Signal axes</strong>
        <span style={{ color: "var(--text-tertiary)" }}>· 4 purchase-intent triggers</span>
        <span className="line" />
      </div>
      <div className="signal-grid">
        {SIGNAL_CONFIG.map(({ key, label, color, grad }) => {
          const sig = signals[key];
          const pct = sig ? Math.round((sig.score / sig.max) * 100) : 0;
          return (
            <div key={key} className="signal-card">
              <div className="name">
                <span className="swatch" style={{ background: color }} />
                {label}
              </div>
              <div className="num">{sig?.score ?? "—"}</div>
              <div className="delta" style={{ color: "var(--text-tertiary)" }}>/{sig?.max ?? 100}</div>
              <div className="bar">
                <div className="fill" style={{ width: `${pct}%`, background: grad }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="section-label" style={{ marginTop: 24 }}>
        <span className="ic" style={{ background: "var(--text-tertiary)", boxShadow: "none" }} />
        <strong>Account context</strong>
        <span style={{ color: "var(--text-tertiary)" }}>· shown for research, excluded from score</span>
        <span className="line" />
      </div>
      <div className="signal-grid">
        {CONTEXT_CONFIG.map(({ key, label, color }) => {
          const signal = signals[key];
          if (!signal) return null;
          return (
            <div key={key} className="signal-card">
              <div className="name"><span className="swatch" style={{ background: color }} />{label}</div>
              <div className="num">{signal.score}</div>
              <div className="delta" style={{ color: "var(--text-tertiary)" }}>/{signal.max} · context</div>
              <div className="bar"><div className="fill" style={{ width: `${Math.round((signal.score / signal.max) * 100)}%`, background: color }} /></div>
              <div className="delta" style={{ color: "var(--text-tertiary)", marginTop: 8 }}>{signal.detail}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const RADAR_AXES = ["funding", "hiring", "news", "technology"] as const;
const RADAR_ANGLES = [-90, 0, 90, 180].map((d) => (d * Math.PI) / 180);
const RADAR_LABELS = ["Funding", "Hiring", "News", "Tech"];
const R = 100;

function toXY(angle: number, ratio: number): [number, number] {
  return [Math.cos(angle) * R * ratio, Math.sin(angle) * R * ratio];
}

function CompetitiveAnalysis({
  result,
  onCopyEmail,
  emailCopied,
}: {
  result: ScoreCardData;
  onCopyEmail?: () => void;
  emailCopied?: boolean;
}) {
  const signals = result.signals;
  if (!signals && !result.recommended_action && !result.why_now) return null;

  const companyPoints = signals
    ? RADAR_AXES.map((key, i) => {
        const sig = signals[key];
        const ratio = sig ? sig.score / sig.max : 0;
        return toXY(RADAR_ANGLES[i], ratio);
      })
    : [];
  const pointsStr = companyPoints.map(([x, y]) => `${x},${y}`).join(" ");
  const ringPoints = (ratio: number) =>
    RADAR_ANGLES.map((a) => toXY(a, ratio))
      .map(([x, y]) => `${x},${y}`)
      .join(" ");

  const strengths = signals
    ? RADAR_AXES.filter((k) => {
        const s = signals[k];
        return s && s.score / s.max > 0.7;
      })
    : [];
  const gaps = signals
    ? RADAR_AXES.filter((k) => {
        const s = signals[k];
        return s && s.score / s.max < 0.4;
      })
    : [];

  return (
    <>
      {signals && (
        <>
          <div className="section-label" style={{ marginTop: 32 }}>
            <span className="ic" style={{ background: "var(--accent-2)", boxShadow: "0 0 6px var(--accent-2)" }} />
            <strong>Signal radar</strong>
            <span style={{ color: "var(--text-tertiary)" }}>· {result.company} vs signal benchmarks</span>
            <span className="line" />
          </div>

          <div className="ca-radar-block">
            <div className="ca-radar-wrap">
              <svg className="ca-radar-svg" viewBox="-130 -130 260 260">
                <g fill="none" stroke="var(--border)" strokeWidth="1">
                  {[0.25, 0.5, 0.75, 1].map((ratio) => (
                    <polygon key={ratio} points={ringPoints(ratio)} />
                  ))}
                </g>
                <g stroke="var(--border-subtle)" strokeWidth="1">
                  {RADAR_ANGLES.map((a, i) => (
                    <line key={i} x1="0" y1="0" x2={Math.cos(a) * R} y2={Math.sin(a) * R} />
                  ))}
                </g>
                <polygon points={pointsStr} fill="rgba(74,222,128,0.18)" stroke="#4ade80" strokeWidth="2" />
                {companyPoints.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="3" fill="#4ade80" />
                ))}
                <g fontFamily="var(--font-sans)" fontSize="9" fill="#8a8f98">
                  {RADAR_ANGLES.map((a, i) => {
                    const lx = Math.cos(a) * (R + 14);
                    const ly = Math.sin(a) * (R + 14);
                    const anchor = lx < -5 ? "end" : lx > 5 ? "start" : "middle";
                    return (
                      <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle">
                        {RADAR_LABELS[i]}
                      </text>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="ca-radar-legend">
              <div className="ca-legend-row">
                <span className="swatch" style={{ background: "#4ade80" }} />
                <span className="name">
                  <span className="co-av" style={{ background: avColor(result.company) }}>{result.company[0]}</span>
                  <span className="label">{result.company}</span>
                  <span className="you-tag">You</span>
                </span>
                <span className="avg">{result.intent_score}</span>
              </div>

              <div className="sg-grid">
                <div className="sg-col win">
                  <div className="head">Where {result.company} leads</div>
                  <div className="list">
                    {strengths.length > 0 ? (
                      strengths.map((k) => {
                        const s = signals[k];
                        return (
                          <div key={k} className="it">
                            <span>
                              <strong style={{ textTransform: "capitalize" }}>{k}</strong> · {s?.score}/{s?.max} · {s?.detail?.slice(0, 80)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="it"><span>No dominant signals detected</span></div>
                    )}
                  </div>
                </div>
                <div className="sg-col gap">
                  <div className="head">Signals to watch</div>
                  <div className="list">
                    {gaps.length > 0 ? (
                      gaps.map((k) => {
                        const s = signals[k];
                        return (
                          <div key={k} className="it">
                            <span>
                              <strong style={{ textTransform: "capitalize" }}>{k}</strong> · {s?.score}/{s?.max} · {s?.detail?.slice(0, 80)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="it"><span>No weak signals — all axes are healthy</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {(result.recommended_action || result.why_now) && (
        <div className="ca-block" style={{ marginBottom: 8 }}>
          <div className="ca-verdict">
            <div className="ai-dot" />
            <div className="text">
              <span className="label">AI verdict</span>
              {result.recommended_action && <strong>{result.recommended_action} </strong>}
              {result.why_now}
            </div>
            <div className="verdict-actions">
              {onCopyEmail && (
                <button
                  type="button"
                  className="tb-btn outlined"
                  onClick={onCopyEmail}
                  disabled={!result.email_subject && !result.talk_track}
                >
                  {emailCopied ? "Copied!" : "Copy email + talk track"}
                </button>
              )}
              <a
                className="tb-btn"
                style={{
                  background: "var(--brand)",
                  color: "#000",
                  padding: "0 12px",
                  height: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "var(--r-sm)",
                  fontSize: 13,
                  textDecoration: "none",
                }}
                href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(result.company)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Draft outreach →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function scoreFromToolResult(name: string, result: unknown): ScoreCardData | null {
  if ((name !== "score_company" && name !== "get_company_details") || !result || typeof result !== "object") {
    return null;
  }
  const row = result as Record<string, unknown>;
  if (typeof row.error === "string") return null;
  const intent =
    typeof row.intent_score === "number" ? row.intent_score
    : typeof row.score === "number" ? row.score
    : null;
  const band = row.score_band;
  const company = typeof row.company === "string" ? row.company : null;
  const domain = typeof row.domain === "string" ? row.domain : null;
  if (intent == null || (band !== "HOT" && band !== "WARM" && band !== "COLD") || !company || !domain) {
    return null;
  }
  return {
    company,
    domain,
    intent_score: intent,
    score_band: band,
    ai_summary: typeof row.ai_summary === "string" ? row.ai_summary : undefined,
    recommended_action: typeof row.recommended_action === "string" ? row.recommended_action : undefined,
    buying_stage: typeof row.buying_stage === "string" ? row.buying_stage : undefined,
    urgency: typeof row.urgency === "string" ? row.urgency : undefined,
    why_now: typeof row.why_now === "string" ? row.why_now : undefined,
    email_subject: typeof row.email_subject === "string" ? row.email_subject : undefined,
    talk_track: typeof row.talk_track === "string" ? row.talk_track : undefined,
    signals: row.signals && typeof row.signals === "object" ? row.signals as SignalSet : undefined,
  };
}

export function ScoreResultCard({
  result,
  onWatchlist,
  watchlistAdded,
  watchlistAdding,
  onCopyEmail,
  emailCopied,
}: {
  result: ScoreCardData;
  onWatchlist?: () => void;
  watchlistAdded?: boolean;
  watchlistAdding?: boolean;
  onCopyEmail?: () => void;
  emailCopied?: boolean;
}) {
  return (
    <div className="score-result-card">
      <ResultHead
        result={result}
        onWatchlist={onWatchlist}
        watchlistAdded={watchlistAdded}
        watchlistAdding={watchlistAdding}
      />
      <OverviewBlock result={result} />
      {result.signals && <SignalGrid signals={result.signals} />}
      <CompetitiveAnalysis result={result} onCopyEmail={onCopyEmail} emailCopied={emailCopied} />
    </div>
  );
}
