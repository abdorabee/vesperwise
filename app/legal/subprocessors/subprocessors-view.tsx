"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

const T = {
  bg:           "#08090a",
  bgEl:         "#0e1011",
  surface:      "#131517",
  txtPrimary:   "#f7f8f8",
  txtSecondary: "#b4bbc8",
  txtTertiary:  "#8a8f98",
  txtQuaternary:"#62666d",
  border:       "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.13)",
  accent:       "#dfff00",
  accent2:      "#e8ff40",
  cyan:         "#dfff00",
  cyanSoft:     "rgba(223,255,0,0.16)",
  fontSans:     "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  fontMono:     "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

const TOC = [
  { id: "s1", num: "01", label: "Overview" },
  { id: "s2", num: "02", label: "Current subprocessors" },
  { id: "s3", num: "03", label: "Change notice" },
  { id: "s4", num: "04", label: "Security standards" },
];

const NAV_LINKS = [
  { label: "Product",    href: "/#product"   },
  { label: "Autopilot",  href: "/#autopilot" },
  { label: "Developers", href: "/docs"       },
  { label: "Pricing",    href: "/pricing"    },
];

function Section({ id, num, title, children, first }: {
  id: string; num: string; title: string; children: React.ReactNode; first?: boolean;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: "100px" }}>
      <h2 style={{ margin: first ? "0 0 18px" : "56px 0 18px", fontSize: "26px", fontWeight: 500, letterSpacing: "-0.022em", lineHeight: 1.2, color: T.txtPrimary, display: "flex", alignItems: "baseline", gap: "12px" }}>
        <span style={{ fontFamily: T.fontMono, fontSize: "12px", fontWeight: 500, color: T.txtQuaternary, letterSpacing: "0.04em", flexShrink: 0 }}>{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginBottom: "14px", lineHeight: 1.65, letterSpacing: "-0.006em", color: T.txtSecondary, fontSize: "15px", textWrap: "pretty" as never }}>
      {children}
    </p>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: T.txtPrimary, textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.13)", textUnderlineOffset: "3px" }}>
      {children}
    </Link>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>{children}</strong>;
}

function DocTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ margin: "18px 0 24px", border: `1px solid ${T.border}`, borderRadius: "6px", overflow: "hidden", background: T.bgEl }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: T.txtTertiary, fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ textAlign: "left", padding: "10px 14px", borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", color: T.txtSecondary, verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SubprocessorsView() {
  const [activeId, setActiveId] = useState("s1");

  useEffect(() => {
    const sections = TOC.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); }); },
      { root: null, rootMargin: "-92px 0px -60% 0px" }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: T.bg, color: T.txtPrimary, fontFamily: T.fontSans, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" } as React.CSSProperties}>
      <style>{`
        html { scroll-behavior: smooth; }
        .toc-link { transition: color 0.12s, background 0.12s; cursor: pointer; }
        .toc-link:hover { color: #f7f8f8 !important; background: rgba(255,255,255,0.03) !important; }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 100, height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: T.txtSecondary, background: "rgba(8,9,10,0.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}`, letterSpacing: "-0.011em", gap: 0 } as React.CSSProperties}>
        <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>Subprocessors</strong>
      </div>

      <nav style={{ position: "sticky", top: "36px", zIndex: 50, background: "rgba(8,9,10,0.72)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}` } as React.CSSProperties}>
        <div style={{ display: "flex", alignItems: "center", height: "56px", padding: "0 24px", maxWidth: "1320px", margin: "0 auto", gap: "28px" }}>
          <Link href="/" aria-label="VesperWise home" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600, letterSpacing: "-0.022em", fontSize: "15px", color: T.txtPrimary, textDecoration: "none" }}>
            <VesperWiseLogo size={42} variant="wordmark" />
          </Link>
          <div className="mkt-navlinks" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", color: T.txtSecondary, padding: "6px 10px", borderRadius: "6px", letterSpacing: "-0.011em", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/login" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtSecondary, padding: "6px 10px", borderRadius: "6px", textDecoration: "none" }}>Sign in</Link>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtPrimary, padding: "0 14px", height: "32px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>Start free</Link>
          <Link href="/contact#contact-form" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: "#000000", padding: "0 14px", height: "32px", borderRadius: "6px", background: T.accent, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 } as React.CSSProperties}>
            Talk to us
            <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
          </Link>
        </div>
      </nav>

      <section style={{ position: "relative", padding: "88px 0 64px", overflow: "hidden", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
          <div style={{ position: "absolute", left: "50%", top: "-200px", width: "1100px", height: "560px", transform: "translateX(-50%)", background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(223,255,0,0.20), transparent 60%), radial-gradient(ellipse 40% 70% at 30% 30%, rgba(223,255,0,0.13), transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)" } as React.CSSProperties} />
        </div>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500, color: T.txtSecondary, letterSpacing: "-0.011em", marginBottom: "22px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan, boxShadow: "0 0 8px #dfff00", display: "block" }} />
            Legal · Subprocessors
          </div>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            Subprocessors.
          </h1>
          <p style={{ maxWidth: "620px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em" }}>
            Third-party service providers VesperWise uses to operate the Service. Referenced in our{" "}
            <A href="/privacy">Privacy Policy</A> and <A href="/legal/dpa">DPA</A>.
          </p>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "64px", padding: "64px 24px 96px", maxWidth: "1200px", margin: "0 auto" }}>

        <aside style={{ position: "sticky", top: "92px", alignSelf: "start", fontSize: "13px", maxHeight: "calc(100vh - 100px)", overflowY: "auto", paddingRight: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: T.txtQuaternary, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px", paddingLeft: "12px" }}>Contents</div>
          <ol>
            {TOC.map(({ id, num, label }) => {
              const active = activeId === id;
              return (
                <li key={id}>
                  <a href={`#${id}`} className="toc-link" onClick={() => setActiveId(id)} style={{ display: "flex", gap: "10px", padding: "5px 12px", borderRadius: "4px", color: active ? T.txtPrimary : T.txtTertiary, letterSpacing: "-0.006em", fontSize: "13px", lineHeight: 1.4, textDecoration: "none", background: active ? "rgba(255,255,255,0.04)" : "transparent" }}>
                    <span style={{ fontFamily: T.fontMono, fontSize: "10px", color: active ? T.accent2 : T.txtQuaternary, letterSpacing: "0.04em", flexShrink: 0, paddingTop: "2px" }}>{num}</span>
                    {label}
                  </a>
                </li>
              );
            })}
          </ol>
        </aside>

        <main style={{ maxWidth: "720px", fontSize: "15px", lineHeight: 1.65, color: T.txtSecondary, letterSpacing: "-0.006em" }}>

          <Section id="s1" num="01" title="Overview" first>
            <P>VesperWise uses a small number of third-party service providers (&ldquo;subprocessors&rdquo;) to help us operate the Service.</P>
            <P>We give each subprocessor only the minimum data required to perform their service. No subprocessor receives access to API keys, billing data (except Polar for payment processing), or raw customer lists.</P>
          </Section>

          <Section id="s2" num="02" title="Current subprocessors">
            <P>The table below lists every subprocessor we use and the service they provide.</P>
            <DocTable
              headers={["Provider", "Service", "Location"]}
              rows={[
                [
                  <Strong key="name">Clerk</Strong>,
                  "Authentication, MFA, session management",
                  "United States"
                ],
                [
                  <Strong key="name">Polar.sh</Strong>,
                  "Payment processing (billing, subscription management, card data storage)",
                  "Norway (EU)"
                ],
                [
                  <Strong key="name">Supabase</Strong>,
                  "Postgres database, object storage",
                  "United States"
                ],
                [
                  <Strong key="name">Vercel</Strong>,
                  "Hosting, serverless functions, edge CDN",
                  "United States"
                ],
                [
                  <Strong key="name">Upstash</Strong>,
                  "Redis cache, rate limiting",
                  "United States"
                ],
                [
                  <Strong key="name">OpenRouter</Strong>,
                  "AI model routing",
                  "United States"
                ],
              ]}
            />
            <P><Strong>Card data:</Strong> VesperWise never receives or stores raw card data. Polar.sh collects payment details and stores them with Stripe. We receive only metadata (last 4 digits, brand, expiry) via webhook.</P>
            <P><Strong>AI processing:</Strong> OpenRouter proxies requests to AI providers. See our <A href="/privacy#s6">Privacy Policy § 06 AI processing</A> for details.</P>
          </Section>

          <Section id="s3" num="03" title="Change notice">
            <P>Before adding a new subprocessor, we will update this page. For questions about subprocessor changes, email <A href="mailto:support@vesperwise.com">support@vesperwise.com</A>.</P>
          </Section>

          <Section id="s4" num="04" title="Security standards">
            <P>We select subprocessors that maintain encryption in transit and at rest. For full security details, see our <A href="/legal/security">Security page</A>.</P>
          </Section>

          <div style={{ marginTop: "56px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: T.txtTertiary }}>
            <span>Questions? <A href="mailto:support@vesperwise.com">support@vesperwise.com</A></span>
            <div style={{ display: "flex", gap: "18px" }}>
              <A href="/privacy">Privacy →</A>
              <A href="/legal/dpa">DPA →</A>
              <A href="/legal/security">Security →</A>
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />

    </div>
  );
}
