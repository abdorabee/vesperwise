"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

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
};

/* ─── Syntax highlight helpers ───────────────────────────────── */
const cm = {
  key:  (t: string) => <span style={{ color: "#dfff00" }}>{t}</span>,
  str:  (t: string) => <span style={{ color: T.cyan }}>{t}</span>,
  num:  (t: string) => <span style={{ color: T.warm }}>{t}</span>,
  bool: (t: string) => <span style={{ color: T.hot }}>{t}</span>,
  kw:   (t: string) => <span style={{ color: "#8a8f98" }}>{t}</span>,
  fn:   (t: string) => <span style={{ color: "#e8ff40" }}>{t}</span>,
  flag: (t: string) => <span style={{ color: T.warm }}>{t}</span>,
  url:  (t: string) => <span style={{ color: T.cyan }}>{t}</span>,
  com:  (t: string) => <span style={{ color: T.txtQ, fontStyle: "italic" }}>{t}</span>,
};

/* ─── Rail nav data ──────────────────────────────────────────── */
type NavItem = { id: string; label: string; method?: string };
type NavGroup = { heading: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Getting started",
    items: [
      { id: "quickstart",  label: "Quickstart" },
      { id: "auth",        label: "Authentication" },
      { id: "errors",      label: "Errors" },
      { id: "pagination",  label: "Pagination" },
      { id: "idempotency", label: "Idempotency" },
    ],
  },
  {
    heading: "Scoring",
    items: [
      { id: "score-account", method: "POST",   label: "Score an account" },
      { id: "get-account",   method: "GET",    label: "Retrieve a score" },
      { id: "score-person",  method: "GET",    label: "Score a person" },
    ],
  },
  {
    heading: "Watchlists",
    items: [
      { id: "list-watchlists",   method: "GET",    label: "List watched accounts" },
      { id: "add-to-watchlist",  method: "POST",   label: "Add an account" },
      { id: "remove-watchlist",  method: "DELETE", label: "Remove an account" },
    ],
  },
  {
    heading: "Objects",
    items: [
      { id: "score-object",  method: "OBJ", label: "Score" },
      { id: "signal-object", method: "OBJ", label: "Signal" },
      { id: "person-object", method: "OBJ", label: "Person" },
    ],
  },
  {
    heading: "Reference",
    items: [
      { id: "changelog", method: "LOG", label: "Changelog" },
    ],
  },
];


/* ─── Helper components ──────────────────────────────────────── */
function MethodTag({ method, large }: { method: string; large?: boolean }) {
  type MethodKey = "GET"|"POST"|"PUT"|"DELETE"|"DEL"|"EVT"|"DOC"|"OBJ"|"PKG"|"LOG";
  const styles: Record<MethodKey, { bg: string; color: string }> = {
    GET:    { bg: "rgba(223,255,0,0.14)",  color: T.cyan },
    POST:   { bg: "rgba(74,222,128,0.14)",  color: T.hot },
    PUT:    { bg: "rgba(245,181,68,0.14)",  color: T.warm },
    DELETE: { bg: "rgba(248,113,113,0.14)", color: "#f87171" },
    DEL:    { bg: "rgba(248,113,113,0.14)", color: "#f87171" },
    EVT:    { bg: "rgba(223,255,0,0.18)",  color: "#dfff00" },
    DOC:    { bg: "rgba(255,255,255,0.06)", color: T.txtTert },
    OBJ:    { bg: "rgba(255,255,255,0.06)", color: T.txtTert },
    PKG:    { bg: "rgba(255,255,255,0.06)", color: T.txtTert },
    LOG:    { bg: "rgba(255,255,255,0.06)", color: T.txtTert },
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
      borderRadius: "3px", background: "rgba(255,255,255,0.05)",
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
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "14px", height: "14px", color: "#dfff00", flexShrink: 0, marginTop: "3px" }}>
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
            background: "rgba(255,255,255,0.015)", color: s.color,
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
    optional: { color: T.txtQ,    background: "rgba(255,255,255,0.05)" },
    "one of": { color: T.txtQ,    background: "rgba(255,255,255,0.05)" },
  };
  const bs = badge ? badgeStyles[badge] : null;
  return (
    <div style={{
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
    background: "rgba(255,255,255,0.012)",
  };

  return (
    <div style={{ background: T.bgCode, border: `1px solid ${T.border}`, borderRadius: T.r.md, fontFamily: T.mono, fontSize: "12px", overflow: "hidden", margin: "18px 0 4px" }}>
      <div style={headStyle}>
        <span style={{ textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", fontSize: "10px", color: T.txtQ, marginRight: "auto" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          {panes.map(({ lang }) => (
            <button key={lang} onClick={() => setActive(lang)} style={{ fontFamily: T.mono, fontSize: "11px", padding: "4px 9px", borderRadius: "4px", letterSpacing: "0.02em", color: active === lang ? T.txt : T.txtTert, background: active === lang ? "rgba(255,255,255,0.06)" : "transparent" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderTop: `1px solid ${T.borderSubtle}`, borderBottom: respContent ? `1px solid ${T.borderSubtle}` : "none", fontSize: "11px", color: T.txtTert, background: "rgba(255,255,255,0.012)" }}>
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
    {cm.flag("-H")} {cm.str('"Authorization: Bearer $IIQ_KEY"')} {" \\\n  "}
    {cm.flag("-H")} {cm.str('"Content-Type: application/json"')} {" \\\n  "}
    {cm.flag("-d")} {cm.str("'{ \"domain\": \"stripe.com\" }'")}
  </>
);

const nodePane = (
  <>
    {cm.kw("const")} res {" = "}{cm.kw("await")} {cm.fn("fetch")}{"("}{cm.str('"https://www.vesperwise.com/api/v1/score"')}{", {"}{"\n"}
    {"  method: "}{cm.str('"POST"')}{","}{"\n"}
    {"  headers: {"}{"\n"}
    {"    "}{cm.str('"Authorization"')}{": "}{cm.str("`Bearer ${process.env.VESPERWISE_API_KEY}`")}{","}{"\n"}
    {"    "}{cm.str('"Content-Type"')}{": "}{cm.str('"application/json"')}{","}{"\n"}
    {"  },"}{"\n"}
    {"  body: JSON."}{cm.fn("stringify")}{"({ domain: "}{cm.str('"stripe.com"')}{" }),"}{"\n"}
    {"});"}{"\n\n"}
    {cm.kw("const")} score {" = "}{cm.kw("await")} {"res."}{cm.fn("json")}{"();"}{"\n"}
    console.{cm.fn("log")}{"(score.score_band, score.intent_score);"}
  </>
);

const scoreResponse = (
  <>
    {"{"}
    {"\n  "}{cm.key('"score_id"')}{": "}{cm.str('"scr_01HZ9X3F7QMHN4T"')}{","}
    {"\n  "}{cm.key('"domain"')}{": "}{cm.str('"stripe.com"')}{","}
    {"\n  "}{cm.key('"intent_score"')}{": "}{cm.num("84")}{","}
    {"\n  "}{cm.key('"score_band"')}{": "}{cm.str('"HOT"')}{","}
    {"\n  "}{cm.key('"score_status"')}{": "}{cm.str('"complete"')}{","}
    {"\n  "}{cm.key('"data_coverage"')}{": "}{cm.num("1")}{","}
    {"\n  "}{cm.key('"scoring_version"')}{": "}{cm.str('"v2-linear-2026-07"')}{","}
    {"\n  "}{cm.key('"icp_fit_score"')}{": "}{cm.num("100")}{","}
    {"\n  "}{cm.key('"signals"')}{": {"}
    {"\n    "}{cm.key('"funding"')}{": { "}{cm.key('"score"')}{": 24, "}{cm.key('"max"')}{": 25, "}{cm.key('"status"')}{": "}{cm.str('"ok"')}{" },"}
    {"\n    "}{cm.key('"hiring"')}{": { "}{cm.key('"score"')}{": 17, "}{cm.key('"max"')}{": 20, "}{cm.key('"status"')}{": "}{cm.str('"ok"')}{" },"}
    {"\n    "}{cm.key('"news"')}{": { "}{cm.key('"score"')}{": 15, "}{cm.key('"max"')}{": 20, "}{cm.key('"status"')}{": "}{cm.str('"ok"')}{" },"}
    {"\n    "}{cm.key('"technology"')}{": { "}{cm.key('"score"')}{": 16, "}{cm.key('"max"')}{": 20, "}{cm.key('"status"')}{": "}{cm.str('"ok"')}{" }"}
    {"\n  },"}
    {"\n  "}{cm.key('"recommended_action"')}{": "}{cm.str('"Reference Series H. Anchor on RevOps."')}{","}
    {"\n  "}{cm.key('"ai_summary"')}{": "}{cm.str('"Stripe is showing fresh capital and aggressive RevOps hiring..."')}{","}
    {"\n  "}{cm.key('"cached"')}{": "}{cm.bool("false")}{","}
    {"\n  "}{cm.key('"charged"')}{": "}{cm.bool("true")}
    {"\n}"}
  </>
);


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
  const filteredGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i =>
      !search ||
      i.label.toLowerCase().includes(search.toLowerCase()) ||
      i.method?.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.items.length > 0);

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
  const h1Style: React.CSSProperties = { fontSize: "32px", fontWeight: 500, letterSpacing: "-0.028em", lineHeight: 1.15, color: T.txt, marginBottom: "8px", scrollMarginTop: "100px" };
  const h2Style: React.CSSProperties = { fontSize: "24px", fontWeight: 500, letterSpacing: "-0.022em", color: T.txt, marginBottom: "6px", scrollMarginTop: "100px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const };

  return (
    <div style={{ background: T.bg, color: T.txt, minHeight: "100vh" }}>

      {/* ── Sticky banner ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, height: "36px",
        background: T.bgEl, borderBottom: `1px solid ${T.borderSubtle}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "10px", fontSize: "12px", color: T.txtTert, letterSpacing: "-0.006em",
      }}>
        <span style={{ background: T.accentBg, color: T.accent, border: `1px solid rgba(223,255,0,0.25)`, borderRadius: "999px", padding: "1px 8px", fontSize: "10px", fontWeight: 600, fontFamily: T.mono }}>v1</span>
        <span><strong style={{ color: T.txtSec, fontWeight: 500 }}>API Reference</strong> · base URL{" "}
          <code style={{ fontFamily: T.mono, fontSize: "12px", color: T.cyan }}>https://www.vesperwise.com/api/v1</code>
          {" · "}99.97% uptime over 90d
        </span>
      </div>

      {/* ── Sticky nav ── */}
      <nav style={{
        position: "sticky", top: "36px", zIndex: 40, height: "56px",
        background: "var(--bg-translucent)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.borderSubtle}`,
        display: "flex", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "0 24px", gap: "24px" }}>
          <Link href="/" aria-label="VesperWise home" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <VesperWiseLogo size={42} variant="wordmark" />
          </Link>
          <div className="mkt-navlinks" style={{ display: "flex", gap: "4px" }}>
            {["Product", "Autopilot", "Developers", "Pricing", "Customers", "Company"].map(label => (
              <a key={label} href={label === "Developers" ? "#quickstart" : "#"} style={{ fontSize: "13px", padding: "5px 10px", borderRadius: T.r.md, color: label === "Developers" ? T.txt : T.txtTert, background: label === "Developers" ? "var(--muted)" : "transparent", letterSpacing: "-0.006em", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <Link href="/login" style={{ fontSize: "13px", padding: "6px 12px", borderRadius: T.r.md, color: T.txtSec, border: `1px solid ${T.border}`, background: "var(--background)", textDecoration: "none" }}>Sign in</Link>
            <Link href="/signup" style={{ fontSize: "13px", padding: "6px 14px", borderRadius: T.r.md, color: "#000000", background: T.accent, textDecoration: "none", fontWeight: 500 }}>Get API key</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", padding: "72px 24px 56px", borderBottom: `1px solid ${T.borderSubtle}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(223,255,0,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ fontSize: "12px", color: T.txtTert, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, marginBottom: "16px" }}>
            <span style={{ color: T.accent, marginRight: "8px" }}>✦</span>Developers · API v1
          </div>
          <h1 style={{ fontSize: "clamp(36px,5vw,52px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "18px" }}>
            One endpoint.<br />Any company.{" "}
            <span style={{ background: "linear-gradient(135deg,#dfff00,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Explicit coverage.</span>
          </h1>
          <p style={{ fontSize: "17px", lineHeight: 1.6, color: T.txtSec, maxWidth: "600px", marginBottom: "32px", letterSpacing: "-0.006em" }}>
            POST a domain — get back a coverage-aware 0–100 score, four dated intent triggers, account context, an action, and an AI summary. Scores below 60% reliable trigger coverage return 422 with a null score.
          </p>
          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1px", background: T.borderSubtle, border: `1px solid ${T.border}`, borderRadius: T.r.md, overflow: "hidden", maxWidth: "640px" }}>
            {[
              { k: "P50 latency",    v: "412", unit: "ms" },
              { k: "P99 latency",    v: "2.84", unit: "s" },
              { k: "Uptime · 90d",   v: "99.97", unit: "%" },
              { k: "Cache hit",      v: "71", unit: "%" },
            ].map(({ k, v, unit }) => (
              <div key={k} style={{ background: T.bgEl, padding: "14px 18px" }}>
                <div style={{ fontSize: "10.5px", color: T.txtQ, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px", fontWeight: 500 }}>{k}</div>
                <div style={{ fontSize: "18px", fontWeight: 500, color: T.txt, letterSpacing: "-0.018em", fontFamily: T.mono }}>
                  {v}<span style={{ fontSize: "12px", color: T.txtTert, marginLeft: "2px" }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two-column shell ── */}
      <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0,1fr)", gap: "56px", maxWidth: "1080px", margin: "0 auto", padding: "48px 24px 96px" }}>

        {/* ── Left rail ── */}
        <aside style={{ position: "sticky", top: "100px", alignSelf: "start", maxHeight: "calc(100vh - 116px)", overflowY: "auto", paddingRight: "8px", fontSize: "13px" }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: "18px" }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: T.txtQ, pointerEvents: "none" }}>
              <circle cx="6" cy="6" r="4"/><path d="M9 9l3 3"/>
            </svg>
            <input
              id="api-search"
              type="text"
              placeholder="Search the API"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", fontFamily: "inherit", fontSize: "13px", color: T.txt, background: T.bgEl, border: `1px solid ${T.border}`, borderRadius: T.r.md, padding: "7px 36px 7px 30px", outline: "none", boxSizing: "border-box" as const }}
            />
            <kbd style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontFamily: T.mono, fontSize: "10px", fontWeight: 500, padding: "1px 5px", border: `1px solid ${T.border}`, borderRadius: "3px", color: T.txtQ, background: "rgba(255,255,255,0.02)" }}>⌘K</kbd>
          </div>

          {/* Nav groups */}
          {filteredGroups.map(group => (
            <div key={group.heading} style={{ marginBottom: "22px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: T.txtQ, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", padding: "0 10px" }}>{group.heading}</div>
              <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", margin: 0, padding: 0 }}>
                {group.items.map(item => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "4px 10px", borderRadius: T.r.sm,
                      color: activeId === item.id ? T.txt : T.txtTert,
                      background: activeId === item.id ? "rgba(223,255,0,0.10)" : "transparent",
                      fontSize: "13px", letterSpacing: "-0.006em", lineHeight: 1.45,
                      textDecoration: "none", transition: "color 0.12s, background 0.12s",
                    }}>
                      {"method" in item && item.method && <MethodTag method={item.method} />}
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main style={{ minWidth: 0 }}>

          {/* Quickstart */}
          <section id="quickstart" style={{ paddingBottom: "32px" }}>
            <h1 style={h1Style}>Quickstart</h1>
            <Summary>Get a real score back in under a minute. You&apos;ll need an API key (Settings → Developers) and a domain you want to score. Everything else is a single <IC>POST</IC>.</Summary>
            <H3>1. Get an API key</H3>
            <P>Open <A href="#">Settings → Developers</A> and click <Strong>Create key</Strong>. Keys are shown once on creation, then stored as SHA‑256 hashes on our side — copy it into your secret manager. Test‑mode and live keys are separate: test keys are prefixed <IC>iiq_test_</IC> and don&apos;t deduct credits.</P>
            <H3>2. Score your first account</H3>
            <P>Pick a domain. We&apos;ll fetch four intent triggers (funding, hiring, non-funding news, and dated technology changes), collect Web and GitHub context, compute coverage, and write back an AI summary. A personalized six-hour cache makes repeat scores free.</P>
            <ApiNote><Strong>Use the apex domain.</Strong> Send <IC>stripe.com</IC>. Schemes, paths, and a leading <IC>www.</IC> are normalized, but arbitrary subdomains are not guessed back to an apex.</ApiNote>
            <H3>3. Hook it up</H3>
            <P>For batch enrichment, upload a CSV from the Bulk page in the dashboard — it scores up to 50 accounts per run against the same cache and charging rules. Outbound webhooks and a queued bulk API are not available yet.</P>
          </section>

          {/* Authentication */}
          <section id="auth" style={secStyle}>
            <h1 style={h1Style}>Authentication</h1>
            <Summary>All requests are authenticated with a bearer token in the <IC>Authorization</IC> header. A key belongs to the account that created it, and every request is scoped to that account&apos;s data.</Summary>
            <H3>Header format</H3>
            <P>Pass the key as <IC>Authorization: Bearer {"<key>"}</IC>. Keys are shown once at creation and stored only as a SHA‑256 hash, so we cannot recover one for you — create a replacement instead. Keys never appear in URL parameters; never log them.</P>
            <H3>Rotation & revocation</H3>
            <P>Create the new key, deploy it, then revoke the old one — zero downtime. Revoked keys stop working immediately. There is currently no key expiry, no scoped permission model, and no automated leaked‑key detection.</P>
            <ApiNote><Strong>Availability.</Strong> Self‑serve API key management is not open yet — the endpoints below are live, but keys are issued manually. Email <A href="mailto:support@vesperwise.com">support@vesperwise.com</A> if you want access.</ApiNote>
          </section>

          {/* Errors */}
          <section id="errors" style={secStyle}>
            <h1 style={h1Style}>Errors</h1>
            <Summary>Standard HTTP status codes. The body is always JSON with a <IC>type</IC>, a stable <IC>code</IC>, and a human <IC>message</IC>. We never leak credentials, request bodies, or stack traces.</Summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "8px", margin: "12px 0" }}>
              <ErrorCell num="400" code="invalid_request"      desc={<>The request was malformed — usually a missing field or a bad domain. The <IC>field</IC> property tells you which.</>} />
              <ErrorCell num="401" code="unauthorized"         desc="Key missing, malformed, or revoked. Don't retry — fix the key first." />
              <ErrorCell num="402" code="insufficient_credits" desc={<>Out of credits for the cycle. The <IC>resets_at</IC> field tells you when the next cycle begins.</>} />
              <ErrorCell num="403" code="restricted_use"       desc="Returned when scoring inputs trigger our AUP filter (special‑category data, prohibited verticals)." />
              <ErrorCell num="404" code="not_found"            desc={<>No object with that ID exists in your workspace. IDs are namespaced (<IC>scr_</IC>, <IC>job_</IC>, <IC>wl_</IC>).</>} />
              <ErrorCell num="409" code="idempotency_conflict" desc={<>You reused an <IC>Idempotency-Key</IC> with a different request body, or the same score run is still in progress.</>} />
              <ErrorCell num="422" code="unscorable_domain"    desc={<>Domain resolves but has no usable signal surface — parked, defunct, or no public presence. Returns score <IC>null</IC>.</>} />
            </div>
            <H3>Retry policy</H3>
            <P>Retry idempotent requests with exponential backoff: 1s, 2s, 4s, 8s — five attempts max. <IC>5xx</IC> responses should retry; <IC>4xx</IC> should not. We do not currently enforce per-plan API rate limits, so there is no <IC>429</IC> response to handle.</P>
          </section>


          {/* Pagination */}
          <section id="pagination" style={secStyle}>
            <h1 style={h1Style}>Pagination</h1>
            <Summary>Cursor‑based on all list endpoints. Pass <IC>limit</IC> (max 100, default 20) and <IC>cursor</IC> (from the previous response&apos;s <IC>next_cursor</IC>).</Summary>
            <ParamTable>
              <ParamRow name="data" type="array">The objects on this page, ordered by <IC>created_at</IC> descending.</ParamRow>
              <ParamRow name="has_more" type="boolean">True if more results are available — fetch the next page with <IC>next_cursor</IC>.</ParamRow>
              <ParamRow name="next_cursor" type="string · nullable" isLast><IC>null</IC> when there are no more results.</ParamRow>
            </ParamTable>
          </section>

          {/* Idempotency */}
          <section id="idempotency" style={secStyle}>
            <h1 style={h1Style}>Idempotency</h1>
            <Summary><IC>POST /v1/score</IC> accepts an <IC>Idempotency-Key</IC> header. The key is atomically bound to its request and completed response, so retries cannot double-charge.</Summary>
            <P>Use any unique string up to 255 chars (UUIDv4 is fine). Reusing a key with a <em>different</em> request returns <IC>409 idempotency_conflict</IC>. Completed replays return the original response with an <IC>Idempotency-Replayed: true</IC> header.</P>
          </section>

          {/* Score an account */}
          <section id="score-account" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="POST" path="/v1/score" />
              Score an account
            </h2>
            <Summary>Compute or retrieve a personalized score for a domain. Results are cached for six hours by user, canonical domain, profile fingerprint, and scoring version; cache hits are free.</Summary>
            <ResponseChips codes={[
              { code: "200 ok", type: "ok" },
              { code: "422 unscorable_domain", type: "warn" },
              { code: "402 insufficient_credits", type: "err" },
            ]} />
            <H3>Body parameters</H3>
            <ParamTable>
              <ParamRow name="domain" type="string" badge="required">Apex domain to score. Schemes, paths, and a leading <IC>www.</IC> are normalized.<div style={{ fontFamily: T.mono, fontSize: "11px", color: T.txtQ, marginTop: "6px" }}>Example: <em style={{ fontStyle: "normal", color: T.txtTert }}>stripe.com</em></div></ParamRow>
              <ParamRow name="company" type="string" badge="optional" isLast>A display name for the response and reasoning. Provider evidence is always resolved and cached by canonical domain, not this caller-supplied label.</ParamRow>
            </ParamTable>
            <H3>Optional header</H3>
            <P>Send <IC>Idempotency-Key: &lt;unique value&gt;</IC> to make retries exact-once. The endpoint accepts keys up to 255 characters.</P>
            <H3>Returns</H3>
            <P>A <A href="#score-object">Score object</A>. The HTTP response also carries <IC>X-IIQ-Cache: hit|miss</IC> for billing attribution. Unscorable domains return <IC>422</IC>, <IC>intent_score: null</IC>, and are not charged or written to score history.</P>
            <CodeBlock
              panes={[
                { lang: "curl",   content: curlPane },
                { lang: "Node",   content: nodePane },
              ]}
              respStatus="200 OK · POST /v1/score"
              respLatency="1.42s · cache miss"
              respContent={scoreResponse}
            />
          </section>

          {/* Retrieve a score */}
          <section id="get-account" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/v1/score?domain=…" />
              Compatibility score request
            </h2>
            <Summary>Legacy GET wrapper over the same scoring service as POST. It uses the same cache, exact-once charging, coverage rules, and response shape. New integrations should use POST.</Summary>
            <ResponseChips codes={[{ code: "200 ok", type: "ok" }, { code: "422 unscorable_domain", type: "warn" }]} />
            <H3>Query parameters</H3>
            <ParamTable>
              <ParamRow name="domain" type="string" badge="optional">The canonical company domain. Recommended for reliable matching.</ParamRow>
              <ParamRow name="company" type="string" badge="optional" isLast>Compatibility fallback when no domain is supplied. We derive a best-effort <IC>.com</IC> domain, so explicit domain is safer.</ParamRow>
            </ParamTable>
          </section>


          {/* Score a person */}
          <section id="score-person" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/v1/score/person" />
              Score a person
            </h2>
            <Summary><Strong>Beta.</Strong> Scores an individual from the details you supply: career trajectory, seniority fit, the intent score of their company if you have already scored it, public news mentions, and profile completeness. VesperWise does not currently query third‑party people‑data providers, so the result is only as good as the input you give it.</Summary>
            <ResponseChips codes={[{ code: "200 ok", type: "ok" }, { code: "400 invalid_request", type: "err" }, { code: "402 insufficient_credits", type: "err" }]} />
            <H3>Query parameters</H3>
            <ParamTable>
              <ParamRow name="email" type="string" badge="one of">Work email address.</ParamRow>
              <ParamRow name="linkedin" type="string" badge="one of">LinkedIn profile URL.</ParamRow>
              <ParamRow name="name" type="string" badge="one of">Full name. Must be sent together with <IC>company</IC>.</ParamRow>
              <ParamRow name="company" type="string" badge="optional">Company name. Required when identifying by <IC>name</IC>.</ParamRow>
              <ParamRow name="title" type="string" badge="optional" isLast>Job title. Improves the seniority‑fit component.</ParamRow>
            </ParamTable>
            <ApiNote>Supply at least one of <IC>email</IC>, <IC>linkedin</IC>, or <IC>name</IC>&nbsp;+&nbsp;<IC>company</IC>, or the request returns <IC>400</IC>.</ApiNote>
          </section>

          {/* List watchlist */}
          <section id="list-watchlists" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="GET" path="/v1/watchlist" />
              List watched accounts
            </h2>
            <Summary>Returns every account on your watchlist, most recently added first. Your plan sets the maximum number of accounts you can watch.</Summary>
            <ResponseChips codes={[{ code: "200 ok", type: "ok" }, { code: "401 unauthorized", type: "err" }]} />
          </section>

          {/* Add to watchlist */}
          <section id="add-to-watchlist" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="POST" path="/v1/watchlist" />
              Add an account
            </h2>
            <Summary>Adds a single domain to the watchlist. Adding a domain that is already watched is a no‑op rather than an error. Returns <IC>403</IC> when the account would exceed your plan&apos;s watchlist limit.</Summary>
            <ResponseChips codes={[{ code: "200 ok", type: "ok" }, { code: "403 limit_reached", type: "err" }]} />
            <H3>Body parameters</H3>
            <ParamTable>
              <ParamRow name="domain" type="string" badge="required">Apex domain to watch.</ParamRow>
              <ParamRow name="company_name" type="string" badge="optional" isLast>Display name. Derived from the domain when omitted.</ParamRow>
            </ParamTable>
            <ApiNote>Adding an account does not score it. Score the domain with <A href="#score-account"><IC>POST /v1/score</IC></A> to populate its score and band.</ApiNote>
          </section>

          {/* Remove from watchlist */}
          <section id="remove-watchlist" style={secStyle}>
            <h2 style={h2Style}>
              <EndpointId method="DELETE" path="/v1/watchlist?domain=…" />
              Remove an account
            </h2>
            <Summary>Removes the domain from your watchlist. Does not delete the underlying score history.</Summary>
            <ResponseChips codes={[{ code: "200 ok", type: "ok" }, { code: "400 invalid_request", type: "err" }]} />
          </section>




          {/* Score object */}
          <section id="score-object" style={secStyle}>
            <h1 style={h1Style}>The Score object</h1>
            <Summary>The canonical scoring-v2 response shape returned by <IC>POST /v1/score</IC> and its GET compatibility wrapper.</Summary>
            <ParamTable>
              <ParamRow name="score_id"    type="string">Stable persisted score ID on scorable results.</ParamRow>
              <ParamRow name="domain"      type="string">Apex domain, lower‑cased.</ParamRow>
              <ParamRow name="intent_score" type="integer · 0–100, nullable"><IC>null</IC> when eligible trigger coverage is below 60%.</ParamRow>
              <ParamRow name="score_band"  type="enum">One of <IC>&quot;HOT&quot;</IC> (≥75), <IC>&quot;WARM&quot;</IC> (50–74), <IC>&quot;COLD&quot;</IC> (&lt;50), or <IC>null</IC>.</ParamRow>
              <ParamRow name="score_status" type="enum"><IC>complete</IC>, <IC>partial</IC>, or <IC>unscorable</IC>.</ParamRow>
              <ParamRow name="data_coverage" type="number · 0–1">Eligible trigger weight divided by total trigger weight. Stale last-known-good evidence contributes half weight.</ParamRow>
              <ParamRow name="scoring_version" type="string"><IC>v2-linear-2026-07</IC> for the new linear model.</ParamRow>
              <ParamRow name="icp_fit_score" type="integer · 0–100, nullable">Separate fit score from verified industry (60%) and employee-range alignment (40%).</ParamRow>
              <ParamRow name="signals"     type="object">Four scored triggers plus Web and GitHub context. See <A href="#signal-object">Signal</A> for shape.</ParamRow>
              <ParamRow name="contributions" type="array">Auditable base/effective weight, normalized value, freshness, and contribution for each intent trigger.</ParamRow>
              <ParamRow name="recommended_action" type="string">Schema-validated recommended action, with a deterministic fallback if the AI call fails.</ParamRow>
              <ParamRow name="ai_summary"  type="string">Bounded score reasoning, with deterministic fallback.</ParamRow>
              <ParamRow name="cached"      type="boolean"><IC>true</IC> if served from cache; <IC>false</IC> if computed fresh.</ParamRow>
              <ParamRow name="charged"     type="boolean" isLast><IC>true</IC> only when this request atomically consumed a credit.</ParamRow>
            </ParamTable>
          </section>

          {/* Signal object */}
          <section id="signal-object" style={secStyle}>
            <h1 style={h1Style}>The Signal object</h1>
            <Summary>Funding, Hiring, News, Technology, Web, and GitHub are returned inside <IC>signals</IC>. Only the first four can contribute to <IC>intent_score</IC>; Web and GitHub are context only.</Summary>
            <ParamTable>
              <ParamRow name="score"    type="number">Raw provider score, normalized against <IC>max</IC> before freshness and weighting.</ParamRow>
              <ParamRow name="status"   type="enum"><IC>ok</IC>, <IC>no_signal</IC>, <IC>not_found</IC>, <IC>stale</IC>, or <IC>unavailable</IC>.</ParamRow>
              <ParamRow name="observed_at" type="timestamp · nullable">Actual event date used for freshness. Positive v2 evidence without a valid date cannot contribute.</ParamRow>
              <ParamRow name="evidence" type="array">Structured observations backing the signal, including source metadata.</ParamRow>
              <ParamRow name="source"   type="string">Upstream vendor that provided the data.</ParamRow>
              <ParamRow name="fetched_at" type="timestamp · ISO 8601">When this signal was last fetched from its source.</ParamRow>
              <ParamRow name="source_url" type="URL · optional" isLast>Source page for an individual evidence item, when available.</ParamRow>
            </ParamTable>
          </section>

          {/* Person object */}
          <section id="person-object" style={secStyle}>
            <h1 style={h1Style}>The Person object</h1>
            <Summary>Returned by <IC>GET /v1/score/person</IC>.</Summary>
            <ParamTable>
              <ParamRow name="id"           type="string">Stable person ID. Prefixed <IC>prs_</IC>.</ParamRow>
              <ParamRow name="name"         type="string">Full name as resolved from the enrichment provider.</ParamRow>
              <ParamRow name="email"        type="string">Work email. May differ from the input if resolved via LinkedIn.</ParamRow>
              <ParamRow name="title"        type="string">Current job title at the resolved company.</ParamRow>
              <ParamRow name="company"      type="string">Company domain. Use this to retrieve the underlying Score object.</ParamRow>
              <ParamRow name="intent_score" type="integer · 0–100">The underlying company intent score at resolution time.</ParamRow>
              <ParamRow name="seniority"    type="enum">One of <IC>&quot;ic&quot;</IC>, <IC>&quot;manager&quot;</IC>, <IC>&quot;director&quot;</IC>, <IC>&quot;vp&quot;</IC>, <IC>&quot;c_level&quot;</IC>.</ParamRow>
              <ParamRow name="resolved_at"  type="timestamp · ISO 8601" isLast>When this person was last enriched.</ParamRow>
            </ParamTable>
          </section>


          {/* Changelog */}
          <section id="changelog" style={secStyle}>
            <h1 style={h1Style}>API changelog</h1>
            <Summary>We version the API by URL prefix (currently <IC>/v1</IC>). The <IC>/v1</IC> surface is still evolving — it is not yet frozen, and we do not yet offer a deprecation window or an SLA. Breaking changes will be announced here.</Summary>
            <ParamTable>
              <ParamRow name="2026‑07‑15" type="behavior" isLast>Scoring v2. Responses now carry <IC>scoring_version</IC>, <IC>score_status</IC>, <IC>data_coverage</IC>, <IC>contributions</IC>, and <IC>source_status</IC>. Accounts below minimum source coverage return a null score and are not charged.</ParamRow>
            </ParamTable>

            {/* Doc footer */}
            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: T.txtTert }}>
              <span>Questions? <a href="mailto:developers@vesperwise.com" style={{ color: T.txt, textDecoration: "underline", textDecorationColor: T.borderStrong, textUnderlineOffset: "3px" }}>developers@vesperwise.com</a></span>
              <div style={{ display: "flex", gap: "18px" }}>
                <a href="#" style={{ color: T.txt, textDecoration: "none" }}>Status →</a>
                <Link href="/legal/security" style={{ color: T.txt, textDecoration: "none" }}>Security →</Link>
              </div>
            </div>
          </section>

        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
