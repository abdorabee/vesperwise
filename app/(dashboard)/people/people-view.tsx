"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { PersonIntentScore, DbPersonScore } from "@/lib/types";

interface PeopleViewProps {
  totalCount: number;
  hotCount: number;
  initialScores: DbPersonScore[];
}

type PeopleState = "list" | "score" | "result";

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

function avColor(name: string): string {
  return AV_COLORS[(name?.charCodeAt(0) ?? 0) % AV_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function bandClass(band: string | null): string {
  if (band === "HOT") return "band-hot";
  if (band === "WARM") return "band-warm";
  return "band-cold";
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function parsePersonInput(input: string): { email?: string; linkedin?: string; name?: string; company?: string; title?: string } {
  const trimmed = input.trim();
  if (trimmed.includes("@") && !trimmed.includes("linkedin.com")) return { email: trimmed };
  if (trimmed.includes("linkedin.com/in/")) return { linkedin: trimmed.startsWith("http") ? trimmed : `https://${trimmed}` };
  const atIdx = trimmed.toLowerCase().lastIndexOf(" at ");
  if (atIdx > 0) {
    const beforeAt = trimmed.slice(0, atIdx).trim();
    const company = trimmed.slice(atIdx + 4).trim();
    const commaIdx = beforeAt.indexOf(",");
    if (commaIdx > 0) return { name: beforeAt.slice(0, commaIdx).trim(), title: beforeAt.slice(commaIdx + 1).trim(), company };
    return { name: beforeAt, company };
  }
  return { name: trimmed };
}

export function PeopleView({ totalCount, hotCount, initialScores }: PeopleViewProps) {
  const searchParams = useSearchParams();
  const [pageState, setPageState] = useState<PeopleState>("list");
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState<"email" | "linkedin" | "name">("email");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PersonIntentScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStepIndex(s => Math.min(s + 1, 5)), 430);
    return () => clearInterval(id);
  }, [loading]);

  const handleScore = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true); setError(null); setResult(null); setStepIndex(0); setPageState("result");
    try {
      const parsed = parsePersonInput(input);
      const params = new URLSearchParams();
      if (parsed.email) params.set("email", parsed.email);
      if (parsed.linkedin) params.set("linkedin", parsed.linkedin);
      if (parsed.name) params.set("name", parsed.name);
      if (parsed.company) params.set("company", parsed.company);
      if (parsed.title) params.set("title", parsed.title);
      const res = await fetch(`/api/v1/score/person?${params.toString()}`);
      if (!res.ok) { const err = await res.json() as { error?: string }; throw new Error(err.error ?? "Person scoring failed"); }
      setResult(await res.json() as PersonIntentScore);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [input]);

  function handleCopyEmail() {
    if (!result) return;
    const text = [result.email_subject, result.talk_track].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  const avgIcpFit = initialScores.length > 0
    ? Math.round(initialScores.reduce((sum, s) => sum + Math.round(((s.signals as { seniority_fit?: { score?: number } } | null)?.seniority_fit?.score ?? 0) / 20 * 100), 0) / initialScores.length)
    : 0;
  const championsCount = initialScores.filter(s => s.approach_angle).length;

  const filtered = initialScores.filter(s =>
    !search || [s.person_name, s.person_email, s.person_title, s.person_company].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isDecisionMaker = result && ["vp", "director", "head", "chief", "c-", "ceo", "cto", "coo", "cfo"].some(kw =>
    result.person_seniority?.toLowerCase().includes(kw) || result.person_title?.toLowerCase().includes(kw)
  );

  const STEPS = ["Identity resolved", "Role + tenure", "Engagement history", "Influence graph", "Contact verified", "AI thesis"];

  return (
    <div className="people-shell">

      {/* ── LIST STATE ── */}
      {pageState === "list" && (
        <div className="people-page">
          <div className="page-head">
            <div>
              <h1 className="page-title">People</h1>
              <div className="page-sub">
                Score the human, not just the logo ·{" "}
                <span className="mono" style={{ color: "var(--text-secondary)" }}>{totalCount}</span> people indexed
              </div>
            </div>
            <div className="page-actions">
              <button className="tb-btn outlined">
                <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h8M5 3l-3 3 3 3"/></svg>
                Import CSV
              </button>
              <button className="tb-btn outlined">
                <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="8" height="6"/><path d="M2 5h8"/></svg>
                Export
              </button>
              <button className="btn-primary" style={{ height: 30, padding: "0 12px" }} onClick={() => setPageState("score")}>
                <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2v8M2 6h8"/></svg>
                Score person
              </button>
            </div>
          </div>

          <div className="stat-strip">
            <div className="stat-card">
              <div className="label">People scored</div>
              <div className="num">{totalCount.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="label">HOT contacts</div>
              <div className="num hot">{hotCount}</div>
            </div>
            <div className="stat-card">
              <div className="label">Avg ICP fit</div>
              <div className="num">{avgIcpFit || "—"}</div>
            </div>
            <div className="stat-card">
              <div className="label">Champions identified</div>
              <div className="num">{championsCount}</div>
            </div>
          </div>

          <div className="tools-row">
            <div className="search-input">
              <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="3"/><path d="M7 7l3 3"/></svg>
              <input
                type="text"
                placeholder="Search by name, email, role…"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text-primary)" }}
              />
            </div>
            <span className="band band-hot" style={{ marginLeft: 6, cursor: "pointer" }}><span className="dot"/>{hotCount} HOT</span>
            <span className="band band-warm" style={{ cursor: "pointer" }}><span className="dot"/>{initialScores.filter(s => s.score_band === "WARM").length} WARM</span>
            <span className="band band-cold" style={{ cursor: "pointer" }}><span className="dot"/>{initialScores.filter(s => s.score_band === "COLD").length} COLD</span>
            <div style={{ flex: 1 }} />
            <button className="tb-btn outlined">Sort: Score ↓</button>
          </div>

          {paged.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
              {totalCount === 0 ? 'No people scored yet. Use "Score person" to get started.' : "No results match your search."}
            </div>
          ) : (
            <div className="people-list">
              <div className="pl-head">
                <div>Person</div>
                <div>Role</div>
                <div>Company</div>
                <div>ICP fit</div>
                <div>Signals · last scored</div>
                <div style={{ textAlign: "right" }}>Score</div>
                <div></div>
              </div>
              {paged.map(s => {
                const signals = s.signals as { seniority_fit?: { score?: number } } | null;
                const icpPct = Math.round((signals?.seniority_fit?.score ?? 0) / 20 * 100);
                const icpColor = icpPct >= 75 ? "var(--hot)" : icpPct >= 50 ? "var(--warm)" : "var(--cold)";
                const scoreColor = s.score_band === "HOT" ? "var(--hot)" : s.score_band === "WARM" ? "var(--warm)" : "var(--cold)";
                const keyTriggers = s.key_triggers as string[] | null;
                return (
                  <div key={s.id} className="pl-row" onClick={() => { setInput(s.person_email ?? s.person_name); setPageState("score"); }}>
                    <div className="pl-person">
                      <div className="av" style={{ background: avColor(s.person_name), width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>
                        {initials(s.person_name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">{s.person_name}</div>
                        <div className="email">{s.person_email ?? "—"}</div>
                      </div>
                    </div>
                    <div className="pl-role">
                      {s.person_title ?? "—"}
                      {s.person_seniority && <span className="seniority">{s.person_seniority}</span>}
                    </div>
                    <div className="pl-company">
                      {s.person_company && (
                        <div className="co-av" style={{ background: avColor(s.person_company), width: 18, height: 18, borderRadius: 4, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>
                          {s.person_company[0]}
                        </div>
                      )}
                      {s.person_company ?? "—"}
                    </div>
                    <div className="pl-fit">
                      <div className="bar-wrap">
                        <div className="bar">
                          <div className="fill" style={{ width: `${icpPct}%`, background: icpColor, height: "100%", borderRadius: 999 }} />
                        </div>
                      </div>
                      <div className="val">{icpPct}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {keyTriggers?.[0]?.slice(0, 22) ?? "—"} · <span style={{ color: "var(--text-secondary)" }}>{relTime(s.created_at)}</span>
                    </div>
                    <div className="pl-score" style={{ color: scoreColor }}>{s.score}</div>
                    <div className="pl-actions">
                      <div className="pl-icon-btn">
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M2 4l5 4 5-4M2 3h10v6H2z"/></svg>
                      </div>
                      <div className="pl-icon-btn">
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><circle cx="3" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pl-foot">
                <span>Showing {Math.min(paged.length, PAGE_SIZE)} of {filtered.length}</span>
                {totalPages > 1 && (
                  <div className="pages">
                    <div className="page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>‹</div>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                      <div key={n} className={`page-btn${currentPage === n ? " active" : ""}`} onClick={() => setCurrentPage(n)}>{n}</div>
                    ))}
                    <div className="page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>›</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SCORE STATE ── */}
      {pageState === "score" && (
        <div className="prompt-stage">
          <div className="prompt-bg"><div className="grid"/></div>
          <div className="prompt-inner">
            <div className="prompt-eyebrow">
              <span className="badge" style={{ background: "rgba(223,255,0,0.15)", color: "#9ee0e8", border: "1px solid rgba(223,255,0,0.25)" }}>People</span>
              Drop in an email or LinkedIn URL — we score the human in &lt; 3 seconds
            </div>
            <h1 className="prompt-h1">Who do you want to <span className="grad">score</span>?</h1>
            <p className="prompt-sub">
              Paste a work email or LinkedIn URL. VesperWise resolves the person, pulls role, tenure, engagement, and influence — then returns a 0–100 buying-intent score with AI reasoning.
            </p>

            <div className="input-type-tabs">
              {(["email", "linkedin", "name"] as const).map(t => (
                <span key={t} className={`tt${inputType === t ? " active" : ""}`} onClick={() => setInputType(t)}>
                  {t === "email" && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M2 3h8v6H2z M2 4l4 3 4-3"/></svg>}
                  {t === "linkedin" && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><rect x="2" y="2" width="8" height="8" rx="1"/><path d="M4 5v3M4 4v0M6 8V5M8 8V6.5a1 1 0 00-2 0"/></svg>}
                  {t === "name" && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><circle cx="6" cy="4.5" r="2"/><path d="M2 10c0-2 2-3 4-3s4 1 4 3"/></svg>}
                  {t === "email" ? "Email" : t === "linkedin" ? "LinkedIn URL" : "Name + company"}
                </span>
              ))}
            </div>

            <div className="prompt-holder">
              <div className="prompt-prefix">
                {inputType === "email" && <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M2 4h10v6H2z M2 4.5l5 3.5 5-3.5"/></svg>}
                {inputType === "linkedin" && <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M5 6v4M5 5v0M7 10V7M9 10V8a1 1 0 00-2 0"/></svg>}
                {inputType === "name" && <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="7" cy="5" r="2.5"/><path d="M2 12c0-2.5 2.5-4 5-4s5 1.5 5 4"/></svg>}
              </div>
              <input
                className="prompt-input"
                type="text"
                placeholder={inputType === "email" ? "elif.marwa@stripe.com" : inputType === "linkedin" ? "linkedin.com/in/elifmarwa" : "Elif Marwa, Stripe"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScore()}
                autoFocus
              />
              <div className="prompt-mode">
                <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1l1.5 4.5L13 7l-4.5 1.5L7 13l-1.5-4.5L1 7l4.5-1.5z"/></svg>
                Full enrich
                <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4.5l3 3 3-3"/></svg>
              </div>
              <div className="prompt-go" onClick={handleScore} style={{ cursor: "pointer" }}>
                Score <span className="kbd-inline">↵</span>
              </div>
            </div>

            <div className="prompt-meta">
              <div className="left">
                <span><strong>1</strong> credit · refunded if person not found</span>
                <span>Cached for <strong>24h</strong></span>
              </div>
              <div className="right">
                <span><strong>&lt; 3s</strong> typical</span>
                <span><strong>9</strong> sources</span>
              </div>
            </div>

            {initialScores.length > 0 && (
              <>
                <div className="prompt-section-label">
                  <span>Hot picks from your tracked accounts</span>
                  <span className="line"/>
                </div>
                <div className="suggestion-row">
                  {initialScores.filter(s => s.score_band === "HOT").slice(0, 4).map(s => (
                    <div key={s.id} className="sugg-person" style={{ cursor: "pointer" }} onClick={() => setInput(s.person_email ?? s.person_name)}>
                      <div className="av" style={{ background: avColor(s.person_name), width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>
                        {initials(s.person_name)}
                      </div>
                      {s.person_name}
                      <span className="role-mono">· {s.person_title?.split(" ").slice(0, 3).join(" ") ?? "—"} @ {s.person_company ?? "—"}</span>
                    </div>
                  ))}
                </div>

                <div className="prompt-section-label">
                  <span>Recently scored</span>
                  <span className="line"/>
                </div>
                <div className="suggestion-row">
                  {initialScores.slice(0, 4).map(s => (
                    <div key={s.id} className="sugg-person" style={{ cursor: "pointer" }} onClick={() => setInput(s.person_email ?? s.person_name)}>
                      <div className="av" style={{ background: avColor(s.person_name), width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "var(--bg)", flexShrink: 0 }}>
                        {initials(s.person_name)}
                      </div>
                      {s.person_name}
                      <span className="role-mono">{s.score}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="prompt-feature-row">
              <div className="feat"><span className="ic" style={{ background: "rgba(223,255,0,0.12)", color: "var(--cyan)" }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><circle cx="6" cy="4.5" r="2"/><path d="M2 10c0-2 2-3 4-3s4 1 4 3"/></svg></span>5 person-axes</div>
              <div className="feat"><span className="ic" style={{ background: "rgba(223,255,0,0.12)", color: "#dfff00" }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><circle cx="6" cy="6" r="4"/><path d="M6 4v3l2 1"/></svg></span>AI thesis from Claude</div>
              <div className="feat"><span className="ic" style={{ background: "rgba(74,222,128,0.12)", color: "var(--hot)" }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M3 6l3 3 5-7"/></svg></span>Verified contact</div>
              <div className="feat"><span className="ic" style={{ background: "rgba(245,181,68,0.12)", color: "var(--warm)" }}><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M3 3h6M3 6h6M3 9h4"/></svg></span>Recommended outreach</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <span style={{ cursor: "pointer", fontSize: 12, color: "var(--text-tertiary)" }} onClick={() => setPageState("list")}>← Back to list</span>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT STATE ── */}
      {pageState === "result" && (
        <div className="result-page">
          <div className="live-progress">
            <span className="pulse"/>
            <div className="steps">
              {STEPS.map((s, i) => (
                <span key={i} className={`step${i < stepIndex ? " done" : i === stepIndex && loading ? " active" : ""}`}>
                  <span className="check">
                    {i < stepIndex && <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" width="7" height="7"><path d="M2 5l2 2 4-4"/></svg>}
                  </span>
                  {s}
                </span>
              ))}
            </div>
            {!loading && <span className="timing">Done · 1 credit</span>}
          </div>

          {error && (
            <div style={{ padding: "24px", color: "var(--red)", fontSize: 13 }}>
              {error}
              <span style={{ cursor: "pointer", color: "var(--accent-2)", marginLeft: 8 }} onClick={() => { setPageState("score"); setError(null); }}>Try again</span>
            </div>
          )}

          {!loading && result && (
            <>
              <div className="prompt-holder" style={{ marginBottom: 18 }}>
                <div className="prompt-prefix">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M2 4h10v6H2z M2 4.5l5 3.5 5-3.5"/></svg>
                </div>
                <input className="prompt-input" type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleScore()} style={{ fontSize: 14 }} />
                <div className="prompt-mode">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1l1.5 4.5L13 7l-4.5 1.5L7 13l-1.5-4.5L1 7l4.5-1.5z"/></svg>
                  Full enrich
                  <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4.5l3 3 3-3"/></svg>
                </div>
                <div className="prompt-go" onClick={handleScore} style={{ cursor: "pointer" }}>Re-score</div>
              </div>

              <div className="p-head">
                <div className="p-avatar" style={{ background: avColor(result.person_name) }}>
                  {initials(result.person_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="p-title-row">
                    <span className="p-id">P-{(result.person_email ?? result.person_name).slice(-4).toUpperCase()}</span>
                    <span className={`band ${bandClass(result.score_band)}`}><span className="dot"/>{result.score_band}</span>
                    {isDecisionMaker && <span className="band band-blue"><span className="dot"/>Decision-maker</span>}
                    <span className="p-title">{result.person_name}</span>
                  </div>
                  <div className="p-meta">
                    {result.person_email && <a href={`mailto:${result.person_email}`}>{result.person_email}</a>}
                    {result.person_email && <span className="dot"/>}
                    <span>{[result.person_title, result.person_company].filter(Boolean).join(" @ ")}</span>
                    {result.person_seniority && <><span className="dot"/><span>{result.person_seniority}</span></>}
                    {result.person_linkedin && <><span className="dot"/><a href={result.person_linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
                  </div>
                </div>
                <div className="p-actions">
                  <button className="tb-btn outlined">Save to list</button>
                  {result.person_linkedin && (
                    <a
                      className="btn-primary"
                      style={{ height: 30, padding: "0 12px", display: "inline-flex", alignItems: "center", textDecoration: "none", borderRadius: "var(--r-sm)", fontSize: 13, background: "var(--accent)", color: "#fff" }}
                      href={result.person_linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Draft outreach →
                    </a>
                  )}
                </div>
              </div>

              <div className="overview-block">
                {(() => {
                  const r = 42;
                  const circ = 2 * Math.PI * r;
                  const offset = circ * (1 - result.intent_score / 100);
                  const band = result.score_band;
                  const g = band === "HOT" ? ["#4ade80", "#dfff00", "#e8ff40"] : band === "WARM" ? ["#f5b544", "#8a8f98", "#e8ff40"] : ["var(--text-tertiary)", "var(--text-tertiary)", "var(--text-tertiary)"];
                  return (
                    <div className="score-ring">
                      <svg viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="pScoreGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor={g[0]}/>
                            <stop offset="55%" stopColor={g[1]}/>
                            <stop offset="100%" stopColor={g[2]}/>
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none"/>
                        <circle cx="50" cy="50" r={r} stroke="url(#pScoreGrad)" strokeWidth="6" fill="none"
                          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}/>
                      </svg>
                      <div className="score-ring-center">
                        <span className={`score-ring-band ${bandClass(result.score_band)}`}>
                          <span className="dot"/>{result.score_band}
                        </span>
                        <div className="score-ring-num">{result.intent_score}</div>
                        <div className="score-ring-of">/ 100</div>
                      </div>
                    </div>
                  );
                })()}
                <div className="thesis-block">
                  <div className="thesis-head"><span className="ic"/>AI thesis · Claude</div>
                  <div className="thesis-text">{result.ai_summary}</div>
                  <div className="thesis-meta">
                    <span>Generated just now</span>
                    <span className="dot"/>
                    <span>Urgency: {result.urgency}</span>
                  </div>
                </div>
              </div>

              <div className="section-label">
                <span className="ic"/>
                <strong>Signal axes</strong>
                <span style={{ color: "var(--text-tertiary)" }}>· why this person scored {result.intent_score}</span>
                <span className="line"/>
              </div>
              <div className="signal-grid">
                {([
                  { key: "seniority_fit" as const, label: "ICP fit",   color: "#dfff00", grad: "linear-gradient(90deg,#dfff00,#38a3b3)", max: 20 },
                  { key: "career_change" as const, label: "Career",    color: "#4ade80", grad: "linear-gradient(90deg,#4ade80,#22c55e)", max: 30 },
                  { key: "company_intent" as const, label: "Company",  color: "#f5b544", grad: "linear-gradient(90deg,#f5b544,#d49530)", max: 20 },
                  { key: "news_mentions" as const, label: "Influence", color: "#e8ff40", grad: "linear-gradient(90deg,#e8ff40,#dfff00)", max: 15 },
                  { key: "social_presence" as const, label: "Social",  color: "#8a8f98", grad: "linear-gradient(90deg,#8a8f98,#c0367f)", max: 15 },
                ] as const).map(({ key, label, color, grad, max }) => {
                  const sig = result.signals[key];
                  const pct = sig ? Math.round((sig.score / max) * 100) : 0;
                  return (
                    <div key={key} className="signal-card">
                      <div className="name"><span className="swatch" style={{ background: color }}/>{label}</div>
                      <div className="num">{sig?.score ?? "—"}</div>
                      <div className="delta flat">/{max}</div>
                      <div className="bar"><div className="fill" style={{ width: `${pct}%`, background: grad }}/></div>
                      {sig?.detail && <div className="note">{sig.detail.slice(0, 40)}</div>}
                    </div>
                  );
                })}
              </div>

              <div className="detail-grid">
                <div className="panel">
                  <div className="panel-head">
                    <span className="title">Signal breakdown</span>
                    <span className="sub">from scoring</span>
                  </div>
                  <div className="timeline">
                    {result.why_now && (
                      <div className="tl-row hot">
                        <span className="when">Now</span>
                        <span className="dot"/>
                        <div className="body">{result.why_now}<span className="sub-line">Why now signal</span></div>
                        <span className="pts">+</span>
                      </div>
                    )}
                    {result.key_triggers.map((trigger, i) => (
                      <div key={i} className={`tl-row${i === 0 ? " hot" : i === 1 ? " warm" : ""}`}>
                        <span className="when">Recent</span>
                        <span className="dot"/>
                        <div className="body">{trigger}</div>
                        <span className="pts">+</span>
                      </div>
                    ))}
                    {result.connection_hooks?.map((hook, i) => (
                      <div key={`hook-${i}`} className="tl-row cool">
                        <span className="when">Hook</span>
                        <span className="dot"/>
                        <div className="body">{hook}</div>
                        <span className="pts cool">→</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                  <div className="panel">
                    <div className="panel-head">
                      <span className="title">Person context</span>
                    </div>
                    <div className="panel-body">
                      {[
                        { k: "Company", v: result.person_company ?? "—" },
                        { k: "Seniority", v: result.person_seniority ?? "—" },
                        { k: "Buying stage", v: result.buying_stage },
                        { k: "Urgency", v: result.urgency },
                        { k: "Domain", v: result.person_domain ?? "—" },
                      ].map(({ k, v }) => (
                        <div key={k} className="kv-row">
                          <span className="k">{k}</span>
                          <span className="v">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-head">
                      <span className="title">Approach angle</span>
                    </div>
                    <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {result.approach_angle || result.recommended_action || "No approach angle generated."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 20 }}>
                <div className="next-action" style={{ borderTop: "none" }}>
                  <span className="ai-dot"/>
                  <div className="text">
                    <span className="label">Recommended next action</span>
                    <strong>{result.recommended_action}</strong>
                    {result.why_now && <> {result.why_now}</>}
                  </div>
                  <div className="actions">
                    <button className="tb-btn outlined" onClick={handleCopyEmail} disabled={!result.email_subject && !result.talk_track}>
                      {emailCopied ? "Copied!" : "Copy email + talk track"}
                    </button>
                    <button className="tb-btn outlined" onClick={() => setPageState("list")}>← List</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
