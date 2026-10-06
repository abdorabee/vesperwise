"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";
import { BULK_MAX_CONCURRENT, BULK_MAX_PER_JOB, PLAN_LABEL, PLAN_ORDER as PLAN_KEYS, formatCount } from "@/lib/plan-features";
import { PLAN_CREDITS, PLAN_RATE_LIMIT, PLAN_WATCHLIST_LIMIT } from "@/lib/types";
import { filterNavGroups, type NavGroup } from "./docs-search";


/* ─── Design tokens ──────────────────────────────────────────── */
const T = {
  bg: "var(--background)",
  bgEl: "var(--card)",
  bgCode: "var(--popover)",
  surface: "var(--card)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  borderSubtle: "var(--border-subtle)",
  txt: "var(--foreground)",
  txtSec: "var(--text-secondary)",
  txtTert: "var(--muted-foreground)",
  txtQ: "var(--text-quaternary)",
  accent: "var(--brand)",
  accentBg: "var(--brand-soft)",
  cyan: "var(--brand)",
  hot: "#4ade80",
  hotBd: "rgba(74,222,128,0.25)",
  warm: "#f5b544",
  warmBd: "rgba(245,181,68,0.25)",
  r: { sm: "4px", md: "6px", lg: "12px" },
  mono: "var(--font-code)",
  ink: "var(--brand-ink, var(--text-secondary))",
};

/* ─── Syntax highlight helpers ───────────────────────────────── */
const cm = {
  key:  (t: string) => <span style={{ color: T.txt }}>{t}</span>,
  str:  (t: string) => <span style={{ color: T.ink }}>{t}</span>,
  num:  (t: string) => <span style={{ color: T.warm }}>{t}</span>,
  bool: (t: string) => <span style={{ color: T.hot }}>{t}</span>,
  kw:   (t: string) => <span style={{ color: "#8a8f98" }}>{t}</span>,
  fn:   (t: string) => <span style={{ color: T.txt }}>{t}</span>,
  flag: (t: string) => <span style={{ color: T.warm }}>{t}</span>,
  url:  (t: string) => <span style={{ color: T.ink }}>{t}</span>,
  com:  (t: string) => <span style={{ color: T.txtQ, fontStyle: "italic" }}>{t}</span>,
};


/* ─── Helper components ──────────────────────────────────────── */
function MethodTag({ method, large }: { method: string; large?: boolean }) {
  type MethodKey = "GET"|"POST"|"PUT"|"DELETE"|"DEL"|"EVT"|"DOC"|"OBJ"|"PKG"|"LOG";
  const styles: Record<MethodKey, { bg: string; color: string }> = {
    GET:    { bg: "var(--brand-soft)",  color: T.txt },
    POST:   { bg: "rgba(74,222,128,0.14)",  color: T.hot },
    PUT:    { bg: "rgba(245,181,68,0.14)",  color: T.warm },
    DELETE: { bg: "rgba(248,113,113,0.14)", color: "#f87171" },
    DEL:    { bg: "rgba(248,113,113,0.14)", color: "#f87171" },
    EVT:    { bg: "var(--brand-soft)",  color: T.txt },
    DOC:    { bg: "var(--muted)", color: T.txtTert },
    OBJ:    { bg: "var(--muted)", color: T.txtTert },
    PKG:    { bg: "var(--muted)", color: T.txtTert },
    LOG:    { bg: "var(--muted)", color: T.txtTert },
  };
  const s = styles[method as MethodKey] ?? styles.OBJ;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.mono, fontWeight: 600, letterSpacing: "0.04em",
      borderRadius: "3px", flexShrink: 0,
      fontSize: large ? "10px" : "9px",
      padding: large ? "2px 7px" : "1px 5px",
      minWidth: large ? "42px" : "34px",
      background: s.bg, color: s.color,
    }}>
      {method}
    </span>
  );
}

function EndpointId({ method, path }: { method: string; path: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "10px",
      padding: "5px 10px 5px 6px", background: T.bgEl,
      border: `1px solid ${T.border}`, borderRadius: T.r.md,
      fontFamily: T.mono, fontSize: "12px", color: T.txt,
    }}>
      <MethodTag method={method} large />
      <span style={{ letterSpacing: 0 }}>{path}</span>
    </span>
  );
}

function IC({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: T.mono, fontSize: "12px", padding: "1px 5px",
      borderRadius: "3px", background: "var(--muted)",
      color: T.txt, letterSpacing: 0,
    }}>{children}</code>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: T.txt, textDecoration: "underline", textDecorationColor: T.borderStrong, textUnderlineOffset: "3px" }}>
      {children}
    </a>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: T.txt, fontWeight: 500 }}>{children}</strong>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "14px", lineHeight: 1.65, color: T.txtSec, letterSpacing: "-0.006em", marginBottom: "12px" }}>{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "-0.011em", color: T.txt, margin: "28px 0 10px" }}>{children}</h3>;
}

function Summary({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "15px", lineHeight: 1.6, color: T.txtSec, letterSpacing: "-0.006em", marginBottom: "20px", maxWidth: "620px" }}>{children}</p>;
}

function ApiNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: "10px", padding: "10px 12px", borderRadius: T.r.md,
      background: "rgba(223,255,0,0.06)", border: "1px solid rgba(223,255,0,0.15)",
      margin: "12px 0", fontSize: "13px", lineHeight: 1.55, color: T.txtSec,
    }}>
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "14px", height: "14px", color: T.txt, flexShrink: 0, marginTop: "3px" }}>
        <circle cx="9" cy="9" r="7"/><path d="M9 6v4M9 12h.01"/>
      </svg>
      <div>{children}</div>
    </div>
  );
}

function ResponseChips({ codes }: { codes: { code: string; type: "ok"|"warn"|"err" }[] }) {
  const styles = {
    ok:   { color: T.hot,    borderColor: T.hotBd },
    warn: { color: T.warm,   borderColor: T.warmBd },
    err:  { color: "#f87171", borderColor: "rgba(248,113,113,0.25)" },
  };
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, margin: "6px 0 12px" }}>
      {codes.map(({ code, type }) => {
        const s = styles[type];
        return (
          <span key={code} style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "3px 9px", fontFamily: T.mono, fontSize: "11px",
            borderRadius: "999px", border: `1px solid ${s.borderColor}`,
            background: "transparent", color: s.color,
          }}>{code}</span>
        );
      })}
    </div>
  );
}

function ParamTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.r.md, overflow: "hidden", margin: "12px 0 8px", background: T.bgEl }}>
      {children}
    </div>
  );
}

function ParamRow({ name, type, badge, children, isLast }: {
  name: string; type: string; badge?: "required"|"optional"|"one of";
  children: React.ReactNode; isLast?: boolean;
}) {
  const badgeStyles = {
    required: { color: "#f87171", background: "rgba(248,113,113,0.12)" },
    optional: { color: T.txtQ,    background: "var(--muted)" },
    "one of": { color: T.txtQ,    background: "var(--muted)" },
  };
  const bs = badge ? badgeStyles[badge] : null;
  return (
    <div className="docs-param-row" style={{
      display: "grid", gridTemplateColumns: "196px 1fr", gap: "28px",
      padding: "16px", borderBottom: isLast ? "none" : `1px solid ${T.borderSubtle}`,
      fontSize: "13px", lineHeight: "1.55",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "baseline", gap: "4px 8px", fontFamily: T.mono, fontSize: "13px", fontWeight: 500, color: T.txt, letterSpacing: 0, lineHeight: 1.4 }}>
        {name}
        {badge && bs && (
          <span style={{ fontSize: "9.5px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, padding: "1px 5px", borderRadius: "3px", position: "relative" as const, top: "-1px", ...bs }}>{badge}</span>
        )}
        <span style={{ flexBasis: "100%", fontSize: "11px", fontWeight: 400, color: T.txtQ, marginTop: "1px", letterSpacing: "0.02em" }}>{type}</span>
      </div>
      <div style={{ color: T.txtSec, fontSize: "13px", letterSpacing: "-0.006em" }}>{children}</div>
    </div>
  );
}

function ErrorCell({ num, code, desc }: { num: string; code: string; desc: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.r.md, padding: "12px 14px", background: T.bgEl }}>
      <div style={{ fontFamily: T.mono, fontSize: "12px", color: T.txt, marginBottom: "4px" }}>
        <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "4px", background: "rgba(248,113,113,0.12)", color: "#f87171", fontWeight: 600, marginRight: "6px" }}>{num}</span>
        {code}
      </div>
      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: T.txtTert }}>{desc}</div>
    </div>
  );
}

/* ─── Code block with language tabs ─────────────────────────── */
interface CodePane { lang: string; content: React.ReactNode }
function CodeBlock({ label = "Request", panes, respStatus, respLatency, respContent }: {
  label?: string; panes: CodePane[];
  respStatus?: string; respLatency?: string; respContent?: React.ReactNode;
}) {
  const [active, setActive] = useState(panes[0].lang);
  const [copied, setCopied] = useState(false);
  const activePaneRef = useRef<HTMLDivElement>(null);

  function handleCopy() {
    const text = activePaneRef.current?.innerText ?? "";
    if (navigator.clipboard && text) navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const headStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "4px",
    padding: "0 4px 0 12px", borderBottom: `1px solid ${T.border}`,
    height: "34px", fontSize: "11px", color: T.txtTert,
    background: "transparent",
  };

  return (
    <div style={{ background: T.bgCode, border: `1px solid ${T.border}`, borderRadius: T.r.md, fontFamily: T.mono, fontSize: "12px", overflow: "hidden", margin: "18px 0 4px" }}>
      <div style={headStyle}>
        <span style={{ textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", fontSize: "10px", color: T.txtQ, marginRight: "auto" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          {panes.map(({ lang }) => (
            <button key={lang} onClick={() => setActive(lang)} style={{ fontFamily: T.mono, fontSize: "11px", padding: "4px 9px", borderRadius: "4px", letterSpacing: "0.02em", color: active === lang ? T.txt : T.txtTert, background: active === lang ? "var(--muted)" : "transparent" }}>
              {lang}
            </button>
          ))}
        </div>
        <button onClick={handleCopy} title="Copy" style={{ width: "28px", height: "28px", display: "grid", placeItems: "center", borderRadius: "4px", color: copied ? T.hot : T.txtQ, background: "transparent", marginLeft: "4px" }}>
          {copied
            ? <svg viewBox="0 0 14 14" fill="none" stroke="#4ade80" strokeWidth="1.8" style={{ width: "13px", height: "13px" }}><path d="M3 7l3 3 5-7"/></svg>
            : <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "13px", height: "13px" }}><rect x="4" y="4" width="8" height="8" rx="1"/><path d="M10 4V2.5A.5.5 0 0 0 9.5 2H2.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5H4"/></svg>
          }
        </button>
      </div>
      <div ref={activePaneRef} style={{ padding: "14px 16px", lineHeight: 1.65, color: T.txtSec, fontSize: "12.5px", overflowX: "auto" }}>
        <pre style={{ fontFamily: "inherit", margin: 0 }}>
          {panes.find(p => p.lang === active)?.content}
        </pre>
      </div>
      {respStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderTop: `1px solid ${T.borderSubtle}`, borderBottom: respContent ? `1px solid ${T.borderSubtle}` : "none", fontSize: "11px", color: T.txtTert, background: "transparent" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: T.hot, boxShadow: `0 0 6px ${T.hot}`, display: "inline-block", flexShrink: 0 }} />
          <span>{respStatus}</span>
          {respLatency && <span style={{ marginLeft: "auto", color: T.txtQ, fontFamily: T.mono }}>{respLatency}</span>}
        </div>
      )}
      {respContent && (
        <div style={{ padding: "14px 16px", lineHeight: 1.65, color: T.txtSec, fontSize: "12.5px", overflowX: "auto" }}>
          <pre style={{ fontFamily: "inherit", margin: 0 }}>{respContent}</pre>
        </div>
      )}
    </div>
  );
}

/* ─── Score request code panes ───────────────────────────────── */
const curlPane = (
  <>
    {cm.kw("curl")} {cm.flag("-X")} POST {cm.url("https://www.vesperwise.com/api/v1/score")} {" \\\n  "}
    {cm.flag("-H")} {cm.str('"Authorization: Bearer $VESPERWISE_API_KEY"')} {" \\\n  "}
    {cm.flag("-H")} {cm.str('"Content-Type: application/json"')} {" \\\n  "}
    {cm.flag("-d")} {cm.str("'{\"domain\": \"stripe.com\"}'")}
  </>
);

const nodePane = (
  <>
    {cm.kw("const")} res {" = "}{cm.kw("await")} {cm.fn("fetch")}{"("}{cm.str('"https://www.vesperwise.com/api/v1/score"')}{", {"}{"\n"}
    {"  method: "}{cm.str('"POST"')}{","}{"\n"}
    {"  headers: {"}{"\n"}
    {"    Authorization: "}{cm.str("`Bearer ${process.env.VESPERWISE_API_KEY}`")}{","}{"\n"}
    {"    "}{cm.str('"Content-Type"')}{": "}{cm.str('"application/json"')}{","}{"\n"}
    {"  },"}{"\n"}
    {"  body: JSON."}{cm.fn("stringify")}{"({ domain: "}{cm.str('"stripe.com"')}{" }),"}{"\n"}
    {"});"}{"\n\n"}
    {cm.kw("const")} score {" = "}{cm.kw("await")} res.{cm.fn("json")}{"();"}{"\n"}
    console.{cm.fn("log")}{"(score.score_band, score.intent_score);"}
  </>
);

const scoreResponse = (
  <>
    {"{"}
    {"\n  "}{cm.key('"company"')}{": "}{cm.str('"Stripe"')}{","}
    {"\n  "}{cm.key('"domain"')}{": "}{cm.str('"stripe.com"')}{","}
    {"\n  "}{cm.key('"intent_score"')}{": "}{cm.num("94")}{","}
    {"\n  "}{cm.key('"score_band"')}{": "}{cm.str('"HOT"')}{","}
    {"\n  "}{cm.key('"score_status"')}{": "}{cm.str('"complete"')}{","}
    {"\n  "}{cm.key('"data_coverage"')}{": "}{cm.num("1")}{","}
    {"\n  "}{cm.key('"icp_fit_score"')}{": "}{cm.num("80")}{","}
    {"\n  "}{cm.key('"signals"')}{": {"}
    {"\n    "}{cm.key('"funding"')}{": { "}{cm.key('"score"')}{": 24, "}{cm.key('"max"')}{": 25, "}{cm.key('"status"')}{": "}{cm.str('"ok"')}{", … },"}
    {"\n    "}{cm.com("// hiring, news, technology, web, github")}
    {"\n  },"}
    {"\n  "}{cm.key('"why_now"')}{": "}{cm.str('"Series B 4 days ago and RevOps hiring."')}{","}
    {"\n  "}{cm.key('"recommended_action"')}{": "}{cm.str('"Email the VP Revenue Ops about the Series B."')}{","}
    {"\n  "}{cm.key('"ai_summary"')}{": "}{cm.str('"Stripe has fresh capital and …"')}{","}
    {"\n  "}{cm.key('"cached"')}{": "}{cm.bool("false")}{","}
    {"\n  "}{cm.key('"charged"')}{": "}{cm.bool("true")}
    {"\n}"}
  </>
);

/* ─── Rail nav data ──────────────────────────────────────────── */

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Getting started",
    items: [
      { id: "quickstart",  label: "Quickstart" },
      { id: "auth",        label: "Authentication" },
      { id: "errors",      label: "Errors" },
      { id: "limits",      label: "Limits" },
      { id: "idempotency", label: "Idempotency" },
    ],
  },
  {
    heading: "Scoring",
    items: [
      { id: "score-account", method: "POST", label: "Score a company" },
      { id: "get-account",   method: "GET",  label: "Score (query string)" },
      { id: "score-history", method: "GET",  label: "Score history" },
      { id: "score-person",  method: "GET",  label: "Score a person" },
      { id: "prioritize",    method: "POST", label: "Prioritize a CSV" },
      { id: "bulk-score",    method: "POST", label: "Bulk jobs" },
    ],
  },
  {
    heading: "Watchlist",
    items: [
      { id: "watchlist-list",   method: "GET",    label: "List accounts" },
      { id: "watchlist-add",    method: "POST",   label: "Add an account" },
      { id: "watchlist-remove", method: "DELETE", label: "Remove an account" },
    ],
  },
  {
    heading: "Objects",
    items: [
      { id: "score-object",  method: "OBJ", label: "Score" },
      { id: "signal-object", method: "OBJ", label: "Signal" },
    ],
  },
];

/* ─── Main component ─────────────────────────────────────────── */
export default function DocsView() {
  const [activeId, setActiveId] = useState("quickstart");
  const [search, setSearch] = useState("");

  /* Scroll-based active section */
  useEffect(() => {
    const allIds = NAV_GROUPS.flatMap(g => g.items.map(i => i.id));
    const sections = allIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActiveId(e.target.id);
      });
    }, { rootMargin: "-92px 0px -60% 0px" });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  /* Filter groups by search */
  const filteredGroups = filterNavGroups(NAV_GROUPS, search);

  /* ⌘K → focus search */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        (document.getElementById("api-search") as HTMLInputElement)?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const secStyle: React.CSSProperties = { padding: "32px 0", borderTop: `1px solid ${T.border}` };
  const sectionTitleStyle: React.CSSProperties = { fontSize: "32px", fontWeight: 500, letterSpacing: "-0.028em", lineHeight: 1.15, color: T.txt, marginBottom: "8px", scrollMarginTop: "100px" };
  const h2Style: React.CSSProperties = { fontSize: "24px", fontWeight: 500, letterSpacing: "-0.022em", color: T.txt, marginBottom: "6px", scrollMarginTop: "100px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const };

  return (
    <div style={{ background: T.bg, color: T.txt, minHeight: "100vh" }}>
      <style>{`
        .docs-shell { display: grid; grid-template-columns: 240px minmax(0,1fr); gap: 56px; max-width: 1080px; margin: 0 auto; padding: 48px 16px 96px; }
        .docs-rail { position: sticky; top: 100px; align-self: start; max-height: calc(100vh - 116px); overflow-y: auto; padding-right: 8px; font-size: 13px; }
        @media (max-width: 860px) {
          .docs-shell { grid-template-columns: 1fr; gap: 24px; }
          .docs-rail { position: static; max-height: none; }
        }
        @media (max-width: 640px) {
          .docs-param-row { grid-template-columns: 1fr !important; gap: 8px !important; }
        }
      `}</style>

      <LandingNav />

      {/* ── Hero ── */}
      <section style={{ position: "relative", padding: "64px 16px 48px", borderBottom: `1px solid ${T.borderSubtle}` }}>
        <div style={{ position: "relative", maxWidth: "1080px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(36px,5vw,52px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "18px", textWrap: "balance" } as React.CSSProperties}>
            VesperWise API
          </h1>
          <p style={{ fontSize: "17px", lineHeight: 1.6, color: T.txtSec, maxWidth: "620px", marginBottom: "20px", letterSpacing: "-0.006em" }}>
            POST a domain and get back a 0–100 intent score, the dated signals behind it, a reason it matters now and a suggested next step.
            When there isn&apos;t enough reliable data, you get a <IC>422</IC> with a <IC>null</IC> score instead of a guess.
          </p>
          <p style={{ fontSize: "13px", color: T.txtTert, margin: 0 }}>
            Base URL <code style={{ fontFamily: T.mono, fontSize: "13px", color: T.txt }}>https://www.vesperwise.com/api/v1</code>
          </p>
        </div>
      </section>

      {/* ── Two-column shell ── */}
      <div className="docs-shell">

        {/* ── Left rail ── */}
        <aside className="docs-rail" aria-label="API reference sections">
          <div style={{ position: "relative", marginBottom: "18px" }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: T.txtQ, pointerEvents: "none" }}>
              <circle cx="6" cy="6" r="4"/><path d="M9 9l3 3"/>
            </svg>
            <input
              id="api-search"
              type="text"
              aria-label="Search the API reference"
              placeholder="Search the API"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", fontFamily: "inherit", fontSize: "16px", color: T.txt, background: T.bgEl, border: `1px solid ${T.border}`, borderRadius: T.r.md, padding: "7px 36px 7px 30px", outline: "none", boxSizing: "border-box" as const }}
            />
            <kbd style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontFamily: T.mono, fontSize: "10px", fontWeight: 500, padding: "1px 5px", border: `1px solid ${T.border}`, borderRadius: "3px", color: T.txtQ }}>⌘K</kbd>
          </div>

          {filteredGroups.length === 0 && (
            <p role="status" style={{ fontSize: "13px", color: T.txtTert, padding: "0 10px", margin: "0 0 12px" }}>
              No results for &ldquo;{search.trim()}&rdquo;.{" "}
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: 0, padding: 0, color: T.txt, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>
                Clear search
              </button>
            </p>
          )}
          {filteredGroups.map(group => (
            <div key={group.heading} style={{ marginBottom: "22px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: T.txtTert, margin: "0 0 8px", padding: "0 10px" }}>{group.heading}</div>
              <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", margin: 0, padding: 0 }}>
                {group.items.map(item => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} aria-current={activeId === item.id ? "location" : undefined} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "4px 10px", borderRadius: T.r.sm,
                      color: activeId === item.id ? T.txt : T.txtTert,
                      background: activeId === item.id ? "var(--muted)" : "transparent",
                      fontSize: "13px", letterSpacing: "-0.006em", lineHeight: 1.45,
                      textDecoration: "none", transition: "color 0.12s, background-color 0.12s",
                    }}>
                      {item.method && <MethodTag method={item.method} />}
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main id="main" style={{ minWidth: 0 }}>

          {/* Quickstart */}
          <section id="quickstart" style={{ paddingBottom: "32px" }}>
            <h2 style={sectionTitleStyle}>Quickstart</h2>
            <Summary>You need an API key and a domain to score. Everything else is a single <IC>POST</IC>.</Summary>
            <H3>1. Create an API key</H3>
            <P>Sign in and open <A href="/api-keys">API keys</A>. Keys start with <IC>vesperwise_</IC> and are shown once when created; we store only a SHA‑256 hash. Put the key in your secret manager, for example as <IC>VESPERWISE_API_KEY</IC>.</P>
            <H3>2. Score your first company</H3>
            <P>We check four dated purchase triggers (funding, hiring, news and technology changes), collect website and GitHub context, and return the score with a summary and next step. Asking for the same company again within six hours returns the cached result without using a credit.</P>
            <CodeBlock
              panes={[
                { lang: "curl", content: curlPane },
                { lang: "Node", content: nodePane },
              ]}
            />
            <ApiNote><Strong>Send the company&apos;s main domain.</Strong> <IC>https://www.stripe.com/pricing</IC> is normalized to <IC>stripe.com</IC>, but other subdomains are not mapped back to the main domain.</ApiNote>
          </section>

          {/* Authentication */}
          <section id="auth" style={secStyle}>
            <h2 style={sectionTitleStyle}>Authentication</h2>
            <Summary>Send your key as a bearer token: <IC>Authorization: Bearer vesperwise_…</IC>. Never put keys in URLs.</Summary>
            <P>Every endpoint on this page accepts an API key. Revoking a key in <A href="/api-keys">API keys</A> makes further requests with it return <IC>401</IC>. To rotate, create the new key, deploy it, then revoke the old one.</P>
          </section>

          {/* Errors */}
          <section id="errors" style={secStyle}>
            <h2 style={sectionTitleStyle}>Errors</h2>
            <Summary>Scoring endpoints return JSON with a stable <IC>code</IC> and a readable <IC>message</IC>. Other endpoints return <IC>{"{ \"error\": \"…\" }"}</IC>.</Summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "8px", margin: "12px 0" }}>
              <ErrorCell num="400" code="invalid_request"      desc={<>Malformed body or a domain that can&apos;t be parsed. The <IC>field</IC> property names the problem field.</>} />
              <ErrorCell num="401" code="unauthorized"         desc="Key missing, unknown or revoked. Fix the key before retrying." />
              <ErrorCell num="402" code="insufficient_credits" desc={<>No credits left. The response includes <IC>credits_remaining</IC>.</>} />
              <ErrorCell num="409" code="idempotency_conflict" desc={<>An <IC>Idempotency-Key</IC> was reused with a different request.</>} />
              <ErrorCell num="409" code="score_in_progress"    desc={<>The same score is already running. Retry after the <IC>Retry-After</IC> header (2 seconds).</>} />
              <ErrorCell num="422" code="unscorable_domain"    desc={<>Not enough reliable signal coverage to score. <IC>intent_score</IC> is <IC>null</IC> and no credit is used.</>} />
              <ErrorCell num="500" code="scoring_failed"       desc="Something failed on our side. Safe to retry with the same Idempotency-Key." />
            </div>
          </section>

          {/* Limits */}
          <section id="limits" style={secStyle}>
            <h2 style={sectionTitleStyle}>Limits</h2>
            <Summary>Credits are the main limit: one credit per company scored. The limits below apply per account.</Summary>
            <ParamTable>
              <ParamRow name="Credits" type="per plan">{PLAN_KEYS.map((k, i) => <span key={k}>{i > 0 ? " · " : ""}{PLAN_LABEL[k]} {formatCount(PLAN_CREDITS[k])}/mo</span>)}</ParamRow>
              <ParamRow name="API requests" type="per plan">{PLAN_KEYS.map((k, i) => <span key={k}>{i > 0 ? " · " : ""}{PLAN_LABEL[k]} {formatCount(PLAN_RATE_LIMIT[k])}/min</span>)}</ParamRow>
              <ParamRow name="Watchlist size" type="per plan">{PLAN_KEYS.map((k, i) => <span key={k}>{i > 0 ? " · " : ""}{PLAN_LABEL[k]} {PLAN_WATCHLIST_LIMIT[k] == null ? "unlimited" : formatCount(PLAN_WATCHLIST_LIMIT[k] as number)}</span>)}. Adding past the limit returns <IC>403</IC>.</ParamRow>
              <ParamRow name="Bulk jobs" type="all plans" isLast>Up to {formatCount(BULK_MAX_PER_JOB)} companies per job and {BULK_MAX_CONCURRENT} queued or running jobs at once. A fourth job returns <IC>429</IC>.</ParamRow>
            </ParamTable>
          </section>

          {/* Idempotency */}
          <section id="idempotency" style={secStyle}>
            <h2 style={sectionTitleStyle}>Idempotency</h2>
            <Summary><IC>POST /api/v1/score</IC> accepts an <IC>Idempotency-Key</IC> header, so a retried request never uses a second credit.</Summary>
            <P>Use any unique string up to 255 characters (a UUID works). Reusing a key with a <em>different</em> request returns <IC>409 idempotency_conflict</IC>. Replays of a completed request return the original response with <IC>Idempotency-Replayed: true</IC>.</P>
          </section>

          {/* Score an account */}
          <section id="score-account" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="POST" path="/api/v1/score" />
              Score a company
            </h2>
            <Summary>Compute a score for a domain, personalized to your workspace profile. Results are cached for six hours per workspace and domain; cache hits are free.</Summary>
            <ResponseChips codes={[
              { code: "200 ok", type: "ok" },
              { code: "422 unscorable_domain", type: "warn" },
              { code: "402 insufficient_credits", type: "err" },
              { code: "409 score_in_progress", type: "err" },
            ]} />
            <H3>Body parameters</H3>
            <ParamTable>
              <ParamRow name="domain" type="string" badge="required">The company&apos;s main domain. Schemes, paths and a leading <IC>www.</IC> are removed.</ParamRow>
              <ParamRow name="company" type="string" badge="optional" isLast>Display name used in the response and summary. Evidence is always looked up by domain.</ParamRow>
            </ParamTable>
            <H3>Returns</H3>
            <P>A <A href="#score-object">Score object</A>. The response header <IC>X-IIQ-Cache</IC> is <IC>hit</IC> or <IC>miss</IC>.</P>
            <CodeBlock
              label="Response"
              panes={[{ lang: "200 OK", content: scoreResponse }]}
            />
          </section>

          {/* GET score */}
          <section id="get-account" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/api/v1/score?domain=…" />
              Score (query string)
            </h2>
            <Summary>The same scoring as the POST endpoint, with parameters in the query string. It shares the cache, credit rules and response shape. Prefer POST for new integrations.</Summary>
            <ParamTable>
              <ParamRow name="domain" type="string" badge="one of">The company&apos;s main domain.</ParamRow>
              <ParamRow name="company" type="string" badge="one of" isLast>Used when no domain is given; we try <IC>{"<name>.com"}</IC>, so passing a domain is more reliable.</ParamRow>
            </ParamTable>
          </section>

          {/* History */}
          <section id="score-history" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/api/v1/score/history?domain=…" />
              Score history
            </h2>
            <Summary>Your scores for one domain over the last 90 days, oldest first. Does not use credits.</Summary>
            <P>Returns <IC>{"{ domain, history: [{ score, score_band, score_status, data_coverage, icp_fit_score, created_at, … }] }"}</IC>.</P>
          </section>

          {/* Person */}
          <section id="score-person" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/api/v1/score/person" />
              Score a person
            </h2>
            <Summary>Score a contact on seniority fit, recent job changes and their company&apos;s intent. Uses one credit.</Summary>
            <H3>Query parameters</H3>
            <ParamTable>
              <ParamRow name="email" type="string" badge="one of">Work email address.</ParamRow>
              <ParamRow name="linkedin" type="string" badge="one of">LinkedIn profile URL.</ParamRow>
              <ParamRow name="name + company" type="string" badge="one of">Full name together with the company name.</ParamRow>
              <ParamRow name="title" type="string" badge="optional" isLast>Job title, to help match the right person.</ParamRow>
            </ParamTable>
            <P>Returns the person&apos;s <IC>intent_score</IC>, <IC>score_band</IC>, title, company, seniority, <IC>why_now</IC>, <IC>recommended_action</IC> and a suggested <IC>email_subject</IC> and <IC>talk_track</IC>.</P>
          </section>

          {/* Prioritize */}
          <section id="prioritize" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="POST" path="/api/v1/prioritize" />
              Prioritize a CSV
            </h2>
            <Summary>Upload a CSV with a <IC>domain</IC> or <IC>company</IC> column as multipart field <IC>file</IC>. You get the same CSV back with your latest score columns added, sorted highest first. Only existing scores are used, so no credits are spent.</Summary>
          </section>

          {/* Bulk */}
          <section id="bulk-score" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="POST" path="/api/v1/score/bulk" />
              Bulk jobs
            </h2>
            <Summary>Queue up to {formatCount(BULK_MAX_PER_JOB)} companies in one job, then poll <IC>GET /api/v1/score/bulk?job_id=…</IC> for <IC>status</IC>, <IC>completed</IC> and <IC>results</IC>.</Summary>
            <ParamTable>
              <ParamRow name="companies" type="array<{ domain?, name? }>" badge="required">1–{formatCount(BULK_MAX_PER_JOB)} companies. Your balance must cover one credit per company.</ParamRow>
              <ParamRow name="webhook_url" type="string" badge="optional" isLast>Stored with the job for completion callbacks.</ParamRow>
            </ParamTable>
            <ApiNote><Strong>Early access.</Strong> Bulk jobs are accepted and queued, and background processing is still rolling out. For lists of up to 50 companies today, use CSV upload in the dashboard&apos;s Bulk page.</ApiNote>
          </section>

          {/* Watchlist */}
          <section id="watchlist-list" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/api/v1/watchlist" />
              List watchlist accounts
            </h2>
            <Summary>Returns <IC>{"{ watchlist: [...] }"}</IC>: your active watchlist accounts, highest score first.</Summary>
          </section>

          <section id="watchlist-add" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="POST" path="/api/v1/watchlist" />
              Add an account
            </h2>
            <Summary>Body: <IC>{"{ \"domain\": \"stripe.com\", \"company_name\": \"Stripe\" }"}</IC>. Returns the watchlist row with <IC>201</IC>, or <IC>403</IC> when your plan&apos;s watchlist is full.</Summary>
          </section>

          <section id="watchlist-remove" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="DELETE" path="/api/v1/watchlist?domain=…" />
              Remove an account
            </h2>
            <Summary>Stops watching the domain. Score history is kept.</Summary>
          </section>

          {/* Score object */}
          <section id="score-object" style={secStyle}>
            <h2 style={sectionTitleStyle}>The Score object</h2>
            <Summary>Returned by <IC>POST /api/v1/score</IC> and its GET form.</Summary>
            <ParamTable>
              <ParamRow name="domain"       type="string">Normalized domain, lower-case.</ParamRow>
              <ParamRow name="company"      type="string">Display name.</ParamRow>
              <ParamRow name="intent_score" type="integer · 0–100, nullable"><IC>null</IC> when there isn&apos;t enough reliable trigger coverage.</ParamRow>
              <ParamRow name="score_band"   type="enum"><IC>&quot;HOT&quot;</IC> (75 and up), <IC>&quot;WARM&quot;</IC> (50–74), <IC>&quot;COLD&quot;</IC> (below 50), or <IC>null</IC>.</ParamRow>
              <ParamRow name="score_status" type="enum"><IC>complete</IC>, <IC>partial</IC> or <IC>unscorable</IC>.</ParamRow>
              <ParamRow name="data_coverage" type="number · 0–1">Share of trigger weight backed by usable evidence.</ParamRow>
              <ParamRow name="icp_fit_score" type="integer · 0–100, nullable">How well the company fits your ideal customer profile.</ParamRow>
              <ParamRow name="signals"      type="object">Funding, hiring, news and technology triggers plus web and GitHub context. See <A href="#signal-object">Signal</A>.</ParamRow>
              <ParamRow name="contributions" type="array">Weight, freshness and contribution of each trigger to the score.</ParamRow>
              <ParamRow name="why_now"      type="string">One or two sentences on why the account matters now.</ParamRow>
              <ParamRow name="recommended_action" type="string">Suggested next step for the rep.</ParamRow>
              <ParamRow name="ai_summary"   type="string">Short written summary of the evidence.</ParamRow>
              <ParamRow name="cached"       type="boolean"><IC>true</IC> when served from the six-hour cache.</ParamRow>
              <ParamRow name="charged"      type="boolean" isLast><IC>true</IC> only when this request used a credit.</ParamRow>
            </ParamTable>
          </section>

          {/* Signal object */}
          <section id="signal-object" style={secStyle}>
            <h2 style={sectionTitleStyle}>The Signal object</h2>
            <Summary>Each entry in <IC>signals</IC>. Only funding, hiring, news and technology count toward <IC>intent_score</IC>; web and GitHub are context.</Summary>
            <ParamTable>
              <ParamRow name="score"       type="number">Points earned, out of <IC>max</IC>.</ParamRow>
              <ParamRow name="max"         type="number">Maximum points for this signal.</ParamRow>
              <ParamRow name="detail"      type="string">Plain-language description of what was found.</ParamRow>
              <ParamRow name="status"      type="enum">Whether the source returned usable data, for example <IC>ok</IC> or <IC>no_signal</IC>.</ParamRow>
              <ParamRow name="observed_at" type="timestamp · nullable">Date of the newest event behind the signal. Older events count for less.</ParamRow>
              <ParamRow name="fetched_at"  type="timestamp">When the source was last checked.</ParamRow>
              <ParamRow name="source"      type="string">Data provider identifier.</ParamRow>
              <ParamRow name="evidence"    type="array" isLast>Individual observations, with source URLs when available.</ParamRow>
            </ParamTable>

            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: T.txtTert }}>
              <span>Questions? <a href="/contact#contact-form" style={{ color: T.txt, textDecoration: "underline", textDecorationColor: T.borderStrong, textUnderlineOffset: "3px" }}>Contact us</a></span>
              <Link href="/legal/security" style={{ color: T.txt, textDecoration: "none" }}>Security</Link>
            </div>
          </section>

        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
