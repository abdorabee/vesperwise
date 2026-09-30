"use client";

import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";

const T = {
  bg:            "var(--background)",
  bgEl:          "var(--card)",
  surface:       "var(--popover)",
  txtPrimary:    "var(--foreground)",
  txtSecondary:  "var(--text-secondary)",
  txtTertiary:   "var(--muted-foreground)",
  txtQuaternary: "var(--text-quaternary)",
  border:        "var(--border)",
  borderStrong:  "var(--border-strong)",
  borderSubtle:  "var(--border)",
  accent:        "var(--brand)",
  cyan:          "var(--brand)",
  cyanSoft:      "var(--brand-soft)",
  hot:           "#4ade80",
  warm:          "#f5b544",
  fontSans:      "var(--font-sans)",
  fontMono:      "var(--font-sans)",
};

const CURRENT_CONTROLS = [
  {
    icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M9 2L3 4v5c0 4 6 7 6 7s6-3 6-7V4z"/><path d="M6.5 9l2 2 3-4"/></svg>,
    title: "Authentication",
    items: [
      "Clerk for user authentication",
      "Dashboard access requires active session",
      "API keys are stored as SHA-256 hashes, shown once and revocable",
    ],
  },
  {
    icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><rect x="2" y="3" width="14" height="3"/><rect x="2" y="10" width="14" height="3"/><circle cx="5" cy="4.5" r="0.7" fill="currentColor"/><circle cx="5" cy="11.5" r="0.7" fill="currentColor"/></svg>,
    title: "Infrastructure",
    items: [
      "TLS encryption in transit (Vercel)",
      "Postgres at Supabase with AES-256 at rest",
      "Cached score results are stored in our database and expire after 6 hours",
      "Hosting providers maintain their own SOC 2 reports",
    ],
  },
  {
    icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="9" cy="9" r="6.5"/><path d="M9 5v4l3 1.5"/></svg>,
    title: "Data handling",
    items: [
      "Every API request requires a signed-in session or an API key",
      "Database access is restricted to VesperWise backend services, and queries are scoped to the requesting account",
      "Billing webhooks are signature-verified and idempotent",
      "AI summaries are generated through OpenRouter (see Subprocessors)",
    ],
  },
  {
    icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M3 4v10l6-3 6 3V4z"/><path d="M3 4h12v3H3z"/></svg>,
    title: "Signal sources",
    items: [
      "Explorium (funding enrichment)",
      "GNews, BuiltWith, OpenPageRank, GitHub",
      "Apollo (person enrichment)",
      "All signal vendor API calls use HTTPS",
    ],
  },
];

const PLANNED_WORK = [
  "Database-level tenant isolation hardening",
  "Automated dependency scanning",
  "Audit logging for administrative actions",
];

const NOT_YET = [
  { item: "SOC 2 audit", eta: "Not scheduled" },
  { item: "ISO 27001 certification", eta: "Not scheduled" },
  { item: "Third-party penetration test", eta: "Not scheduled" },
  { item: "Public status page or SLA", eta: "Not scheduled" },
  { item: "Paid bug bounty program", eta: "Not offered" },
];

export default function SecurityView() {
  return (
    <div style={{ background: T.bg, color: T.txtPrimary, fontFamily: T.fontSans, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" } as React.CSSProperties}>
      <style>{`
        html { scroll-behavior: smooth; }
      `}</style>

      <LandingNav />

      <section style={{ position: "relative", padding: "88px 0 64px", overflow: "hidden", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
          <div style={{ position: "absolute", left: "50%", top: "-200px", width: "1100px", height: "560px", transform: "translateX(-50%)", background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(223,255,0,0.20), transparent 60%), radial-gradient(ellipse 40% 70% at 30% 30%, rgba(223,255,0,0.13), transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)" } as React.CSSProperties} />
        </div>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            Security at VesperWise
          </h1>
          <p style={{ maxWidth: "620px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em", marginBottom: "28px" }}>
            This page lists the security controls in place today, what we are working on next, and the formal programs we have not started yet.
          </p>
          <p style={{ maxWidth: "620px", color: T.txtTertiary, fontSize: "15px", lineHeight: 1.55, letterSpacing: "-0.011em" }}>
            If we don&apos;t have a control yet, this page says so. We update it as our security program grows.
          </p>
        </div>
      </section>

      <section style={{ padding: "88px 0 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.hot, display: "block" }} />
              Current controls
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: T.txtPrimary, marginBottom: "16px" }}>
              What we have today.
            </h2>
            <p style={{ fontSize: "16px", color: T.txtTertiary, lineHeight: 1.55, letterSpacing: "-0.006em", maxWidth: "560px" }}>
              These controls are live in production as of August 2026.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1px", background: T.borderSubtle, border: `1px solid ${T.borderSubtle}`, borderRadius: "12px", overflow: "hidden" }}>
            {CURRENT_CONTROLS.map((c) => (
              <div key={c.title} style={{ background: T.bg, padding: "28px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ width: "36px", height: "36px", display: "grid", placeItems: "center", borderRadius: "6px", marginBottom: "4px", background: "rgba(74,222,128,0.10)", color: T.hot }}>{c.icon}</div>
                <h3 style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.018em", lineHeight: 1.2, color: T.txtPrimary }}>{c.title}</h3>
                <ul style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "8px", listStyle: "none" }}>
                  {c.items.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "13px", color: T.txtSecondary, letterSpacing: "-0.006em", lineHeight: 1.45 }}>
                      <svg style={{ width: "12px", height: "12px", flexShrink: 0, marginTop: "3px", color: T.hot }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6l2 2 4-5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "88px 0 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.warm, display: "block" }} />
              In progress
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: T.txtPrimary, marginBottom: "16px" }}>
              What we&apos;re working on.
            </h2>
            <p style={{ fontSize: "16px", color: T.txtTertiary, lineHeight: 1.55, letterSpacing: "-0.006em", maxWidth: "560px" }}>
              These improvements are planned as we scale.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, borderRadius: "12px", background: T.bgEl, padding: "32px 36px" }}>
            <ul style={{ display: "flex", flexDirection: "column", gap: "12px", listStyle: "none" }}>
              {PLANNED_WORK.map((item) => (
                <li key={item} style={{ display: "flex", gap: "12px", alignItems: "flex-start", fontSize: "15px", color: T.txtSecondary, letterSpacing: "-0.006em", lineHeight: 1.5, padding: "12px 0", borderBottom: PLANNED_WORK.indexOf(item) < PLANNED_WORK.length - 1 ? `1px solid ${T.borderSubtle}` : "none" }}>
                  <svg style={{ width: "16px", height: "16px", flexShrink: 0, marginTop: "2px", color: T.warm }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3l2 2"/></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section style={{ padding: "88px 0 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.txtQuaternary, display: "block" }} />
              Not yet available
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: T.txtPrimary, marginBottom: "16px" }}>
              Formal audits and programs.
            </h2>
            <p style={{ fontSize: "16px", color: T.txtTertiary, lineHeight: 1.55, letterSpacing: "-0.006em", maxWidth: "560px" }}>
              None of these are in place today. Security questions and questionnaires are answered directly by email.
            </p>
          </div>

          <div style={{ border: `1px solid ${T.border}`, borderRadius: "12px", background: T.bgEl, padding: "32px 36px" }}>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0", listStyle: "none" }}>
              {NOT_YET.map((entry, i) => (
                <li key={entry.item} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center", padding: "14px 0", borderBottom: i < NOT_YET.length - 1 ? `1px solid ${T.borderSubtle}` : "none" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <svg style={{ width: "14px", height: "14px", flexShrink: 0, color: T.txtQuaternary }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 7h3"/></svg>
                    <span style={{ fontSize: "15px", color: T.txtSecondary, letterSpacing: "-0.006em" }}>{entry.item}</span>
                  </div>
                  <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.txtQuaternary, letterSpacing: "0.02em" }}>{entry.eta}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section style={{ padding: "88px 0 96px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan, display: "block" }} />
              Contact
            </div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: T.txtPrimary, marginBottom: "12px" }}>
              Report a problem.
            </h2>
            <p style={{ fontSize: "16px", color: T.txtTertiary, lineHeight: 1.55, letterSpacing: "-0.006em", maxWidth: "560px", marginBottom: "24px" }}>
              If you find a security issue, please email <a href="mailto:security@vesperwise.com" style={{ color: T.txtPrimary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>security@vesperwise.com</a> with steps to reproduce. We don&apos;t offer paid bounties, but every report is read and answered.
            </p>
            <p style={{ fontSize: "14px", color: T.txtTertiary, lineHeight: 1.55, letterSpacing: "-0.006em", maxWidth: "560px" }}>
              For other legal documents, see <Link href="/privacy" style={{ color: T.txtPrimary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>Privacy</Link>, <Link href="/terms" style={{ color: T.txtPrimary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>Terms</Link>, and <Link href="/legal/dpa" style={{ color: T.txtPrimary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>DPA</Link> and <Link href="/legal/subprocessors" style={{ color: T.txtPrimary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>Subprocessors</Link>.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
