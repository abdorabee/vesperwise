"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

/* ── Design tokens (identical to terms-view.tsx) ─────────── */
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
  { id: "s1",  num: "01", label: "Overview" },
  { id: "s2",  num: "02", label: "What we collect" },
  { id: "s3",  num: "03", label: "How we use it" },
  { id: "s4",  num: "04", label: "Cookies & analytics" },
  { id: "s5",  num: "05", label: "Sharing & subprocessors" },
  { id: "s6",  num: "06", label: "AI processing" },
  { id: "s7",  num: "07", label: "International transfers" },
  { id: "s8",  num: "08", label: "Your rights" },
  { id: "s9",  num: "09", label: "Retention" },
  { id: "s10", num: "10", label: "Security" },
  { id: "s11", num: "11", label: "Children" },
  { id: "s12", num: "12", label: "Changes & contact" },
];

const NAV_LINKS = [
  { label: "Product",    href: "/#product"   },
  { label: "Autopilot",  href: "/#autopilot" },
  { label: "Developers", href: "/docs"       },
  { label: "Pricing",    href: "/#pricing"   },
];

/* ── Primitives ─────────────────────────────────────────────── */

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "20px 0", padding: "14px 16px", borderRadius: "6px", background: "rgba(223,255,0,0.06)", border: "1px solid rgba(223,255,0,0.18)", fontSize: "14px", lineHeight: 1.55, color: T.txtSecondary, display: "flex", gap: "12px" }}>
      <svg style={{ width: "18px", height: "18px", flexShrink: 0, color: "#dfff00", marginTop: "1px" }} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="7" /><path d="M9 6v4M9 12h.01" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

function GoodCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "20px 0", padding: "14px 16px", borderRadius: "6px", background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.18)", fontSize: "14px", lineHeight: 1.55, color: T.txtSecondary, display: "flex", gap: "12px" }}>
      <svg style={{ width: "18px", height: "18px", flexShrink: 0, color: "#4ade80", marginTop: "1px" }} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="7" /><path d="M5 9l3 3 5-5" />
      </svg>
      <div>{children}</div>
    </div>
  );
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

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: "28px 0 10px", fontSize: "16px", fontWeight: 500, letterSpacing: "-0.011em", color: T.txtPrimary }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ marginBottom: "14px", lineHeight: 1.65, letterSpacing: "-0.006em", color: T.txtSecondary, fontSize: "15px", textWrap: "pretty" as never }}>
      {children}
    </p>
  );
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: "12px 0 18px", paddingLeft: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ position: "relative", paddingLeft: "22px", marginBottom: "6px", fontSize: "15px", lineHeight: 1.65, color: T.txtSecondary, letterSpacing: "-0.006em" }}>
          <span style={{ position: "absolute", left: "8px", top: "11px", width: "4px", height: "4px", borderRadius: "999px", background: T.txtQuaternary, display: "block" }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function OL({ items }: { items: React.ReactNode[] }) {
  return (
    <ol style={{ margin: "12px 0 18px", paddingLeft: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ position: "relative", paddingLeft: "22px", marginBottom: "6px", fontSize: "15px", lineHeight: 1.65, color: T.txtSecondary, letterSpacing: "-0.006em" }}>
          <span style={{ position: "absolute", left: 0, top: 0, fontFamily: T.fontMono, fontSize: "12px", color: T.txtQuaternary }}>{i + 1}.</span>
          {item}
        </li>
      ))}
    </ol>
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

function Code({ children }: { children: React.ReactNode }) {
  return <code style={{ fontFamily: T.fontMono, fontSize: "13px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: T.txtPrimary }}>{children}</code>;
}

/* ── Main component ─────────────────────────────────────────── */

export default function PrivacyView() {
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
        .footer-col-link:hover { color: #f7f8f8 !important; }
      `}</style>

      {/* ── Top banner — sticky ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: T.txtSecondary, background: "rgba(8,9,10,0.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}`, letterSpacing: "-0.011em", gap: 0 } as React.CSSProperties}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginRight: "10px", fontSize: "11px", fontWeight: 600, color: T.cyan, background: T.cyanSoft, padding: "1px 8px", borderRadius: "999px" }}>v2.4</span>
        <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>Privacy Policy</strong>
        <span style={{ margin: "0 6px", color: T.txtQuaternary }}>·</span>
        last updated May 12, 2026
        <span style={{ margin: "0 6px", color: T.txtQuaternary }}>·</span>
        <a href="#" style={{ color: T.txtQuaternary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>view diff</a>
      </div>

      {/* ── Nav — sticky below banner ── */}
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
          <Link href="/#" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: "#000000", padding: "0 14px", height: "32px", borderRadius: "6px", background: T.accent, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 } as React.CSSProperties}>
            Talk to us
            <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", padding: "88px 0 64px", overflow: "hidden", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
          <div style={{ position: "absolute", left: "50%", top: "-200px", width: "1100px", height: "560px", transform: "translateX(-50%)", background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(223,255,0,0.20), transparent 60%), radial-gradient(ellipse 40% 70% at 30% 30%, rgba(223,255,0,0.13), transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)" } as React.CSSProperties} />
        </div>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500, color: T.txtSecondary, letterSpacing: "-0.011em", marginBottom: "22px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan, boxShadow: "0 0 8px #dfff00", display: "block" }} />
            Legal · Privacy
          </div>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            Privacy Policy.
          </h1>
          <p style={{ maxWidth: "620px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em" }}>
            How VesperWise Labs, Inc. collects, uses, and protects your data. Written in plain
            English and mapped to the relevant GDPR clauses in our <A href="/legal/dpa">DPA</A>.
          </p>
        </div>
      </section>

      {/* ── Doc shell ── */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "64px", padding: "64px 24px 96px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* TOC sidebar — sticky */}
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

        {/* Doc body */}
        <main style={{ maxWidth: "720px", fontSize: "15px", lineHeight: 1.65, color: T.txtSecondary, letterSpacing: "-0.006em" }}>

          {/* Doc meta strip */}
          <div style={{ display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap", marginBottom: "32px", paddingBottom: "24px", borderBottom: `1px solid ${T.border}`, fontSize: "12px", color: T.txtTertiary, fontFamily: T.fontMono, letterSpacing: "0.02em" }}>
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Effective</span><span style={{ color: T.txtSecondary }}>May 12, 2026</span></span>
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Version</span>v2.4</span>
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Applies to</span><span style={{ color: T.txtSecondary }}>vesperwise.com + the API</span></span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "2px 8px", border: `1px solid ${T.border}`, borderRadius: "999px", background: "rgba(255,255,255,0.02)", color: T.txtSecondary }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan }} />
              In force
            </span>
          </div>

          {/* Short-version callout */}
          <InfoCallout>
            <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>The short version.</strong>{" "}We collect
            what we need to run the product, bill you, and keep things secure. We never sell your
            data, never train models on it, and never share it with advertisers. Questions? Email{" "}
            <A href="mailto:privacy@vesperwise.com">Abdel-Rahaman</A> directly.
          </InfoCallout>

          {/* ── 01 ── */}
          <Section id="s1" num="01" title="Overview" first>
            <P>VesperWise Labs, Inc. (&ldquo;VesperWise&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the VesperWise platform available at <A href="https://vesperwise.com">vesperwise.com</A> and via the VesperWise API (collectively, the <Strong>&ldquo;Service&rdquo;</Strong>). This Privacy Policy explains what data we collect, why we collect it, and how we handle it.</P>
            <P>You can use the marketing site without giving us any personal data. Once you create an account or call the API, this policy applies. Our <A href="/terms">Terms of Service</A> and this policy together govern your use of the Service.</P>
          </Section>

          {/* ── 02 ── */}
          <Section id="s2" num="02" title="What we collect">
            <H3>Account &amp; identity</H3>
            <UL items={[
              <span key="a">Name, work email, company name, job role, and password hash (via <Strong>Clerk</Strong>)</span>,
              "Profile photo (optional)",
              "IP address, user-agent string, and MFA factors collected by Clerk during authentication",
            ]} />
            <H3>Customer data</H3>
            <UL items={[
              "Domains, company names, and watchlists you submit for scoring",
              "Workflow definitions and Autopilot configuration",
              "API request bodies you send to our scoring endpoints",
              "Person-scoring inputs (name, LinkedIn URL, title) if you use the people-scoring feature",
            ]} />
            <H3>Billing</H3>
            <UL items={[
              <span key="b">Your plan name and credit balance (stored in our database)</span>,
              <span key="c">Card last 4 digits, expiry, and brand — held by <Strong>Polar.sh</Strong>; we receive event metadata only, never raw card data</span>,
            ]} />
            <H3>Product telemetry</H3>
            <UL items={[
              "Page views, button clicks, and feature-usage events (via PostHog, self-hosted in EU)",
              "API request metadata: endpoint, latency, status code — payloads are never logged",
            ]} />
            <H3>Communications</H3>
            <UL items={[
              "Support emails and in-product feedback you send us",
            ]} />
          </Section>

          {/* ── 03 ── */}
          <Section id="s3" num="03" title="How we use it">
            <P>We use your data only for the purposes below. Where GDPR applies, we identify the lawful basis for each:</P>
            <UL items={[
              <span key="a"><Strong>Provide the Service</Strong> — score companies, run Autopilot, serve the dashboard. <em style={{ color: T.txtTertiary }}>Contract.</em></span>,
              <span key="b"><Strong>Bill you</Strong> — process payments, apply credits, send invoices. <em style={{ color: T.txtTertiary }}>Contract / Legal obligation.</em></span>,
              <span key="c"><Strong>Improve the product</Strong> — analyse aggregate usage patterns to prioritise features and fix bugs. <em style={{ color: T.txtTertiary }}>Legitimate interest.</em></span>,
              <span key="d"><Strong>Communicate with you</Strong> — send transactional emails (receipts, expiry warnings), product updates you opt into. <em style={{ color: T.txtTertiary }}>Legitimate interest / Consent.</em></span>,
              <span key="e"><Strong>Comply with law</Strong> — retain billing records, respond to lawful requests. <em style={{ color: T.txtTertiary }}>Legal obligation.</em></span>,
            ]} />
            <P><Strong>We do not</Strong> sell your data, use it to train third-party machine-learning models, or share it with advertisers. Ever.</P>
          </Section>

          {/* ── 04 ── */}
          <Section id="s4" num="04" title="Cookies & analytics">
            <P>We use a small number of first-party cookies. We do not use Google Analytics, Meta Pixel, or any third-party ad-tracking scripts.</P>
            <DocTable
              headers={["Cookie / storage", "Purpose", "Lifetime"]}
              rows={[
                [<Code key="c1">__clerk_session</Code>, "Auth session token", "7 days"],
                [<Code key="c2">__clerk_csrf</Code>, "CSRF protection", "Session"],
                [<Code key="c3">iq_prefs</Code>, "UI preferences (theme, collapsed panels)", "1 year"],
                [<Code key="c4">_iq_anon</Code>, "Anonymous usage analytics", "30 days"],
              ]}
            />
            <P>Analytics are powered by <Strong>PostHog</Strong>, self-hosted in the EU. Event data never leaves EU infrastructure. You can opt out of product analytics in Settings → Privacy.</P>
          </Section>

          {/* ── 05 ── */}
          <Section id="s5" num="05" title="Sharing & subprocessors">
            <P>We share data only with the subprocessors listed on our <A href="/legal/subprocessors">Subprocessors page</A>. These are companies that help us operate the Service (cloud infrastructure, auth, payments, email delivery, analytics). We give each subprocessor only the minimum data they need to perform their service.</P>
            <P>We will notify you at least <Strong>30 days before</Strong> adding a new subprocessor that processes personal data, via the email on your account and a notice in the product. You may object by terminating per Section&nbsp;10 of the Terms.</P>
          </Section>

          {/* ── 06 ── */}
          <Section id="s6" num="06" title="AI processing">
            <P>When you request a score, the company domain and signal data are sent to <Strong>Anthropic</Strong> to generate a human-readable summary and recommended action. We:</P>
            <OL items={[
              <span key="a">Use Anthropic&rsquo;s <Strong>zero-data-retention</Strong> API configuration — prompts and completions are not stored or used for training by Anthropic</span>,
              "Never include API keys, billing information, or user PII in prompts sent to Anthropic",
              <span key="c">Allow you to disable AI summaries entirely in <Strong>Settings → AI</Strong>; doing so replaces summaries with the raw signal data</span>,
            ]} />
            <P>Anthropic&rsquo;s handling of any data that passes through their API is governed by their <A href="https://www.anthropic.com/legal/privacy">Privacy Policy</A> and our DPA addendum with them.</P>
          </Section>

          {/* ── 07 ── */}
          <Section id="s7" num="07" title="International transfers">
            <P>VesperWise is operated from Egypt and the United States. Our production infrastructure runs on AWS <Code>us-east-1</Code>. If you are in the EEA or UK, your data is transferred to the US under the <Strong>Standard Contractual Clauses (EU 2021/914)</Strong> incorporated into our <A href="/legal/dpa">DPA</A>.</P>
            <P>We are targeting an EU-region deployment (Frankfurt, <Code>eu-central-1</Code>) in Q3 2026 to allow EEA customers to keep data on-continent. We will announce this in the product when available.</P>
          </Section>

          {/* ── 08 ── */}
          <Section id="s8" num="08" title="Your rights">
            <GoodCallout>
              <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>One-click delete.</strong>{" "}Settings → Account → Delete account triggers a full purge of your Customer Data within 30 days. No email required.
            </GoodCallout>
            <P>Depending on your location, you may have the right to:</P>
            <UL items={[
              <span key="a"><Strong>Access</Strong> — receive a copy of the personal data we hold about you</span>,
              <span key="b"><Strong>Correct</Strong> — update inaccurate or incomplete data</span>,
              <span key="c"><Strong>Delete</Strong> — request deletion; we&rsquo;ll purge Customer Data within 30 days and retain only what law requires</span>,
              <span key="d"><Strong>Export</Strong> — download your account data in JSON format from Settings → Account → Export</span>,
              <span key="e"><Strong>Object</Strong> — object to processing based on legitimate interest</span>,
              <span key="f"><Strong>Withdraw consent</Strong> — where processing is based on consent (e.g. marketing emails), withdraw at any time</span>,
              <span key="g"><Strong>Lodge a complaint</Strong> — with your local data protection authority if you believe we have mishandled your data</span>,
            ]} />
            <P>To exercise any right, email <A href="mailto:privacy@vesperwise.com">privacy@vesperwise.com</A>. We will respond within 30 days. We may ask you to verify your identity before fulfilling a request.</P>
          </Section>

          {/* ── 09 ── */}
          <Section id="s9" num="09" title="Retention">
            <P>We keep your data for as long as your account is active. After you close your account:</P>
            <UL items={[
              <span key="a"><Strong>Customer Data</Strong> (domains, watchlists, scores, workflows) — deleted within <Strong>90 days</Strong></span>,
              <span key="b"><Strong>Billing records</Strong> — retained for <Strong>7 years</Strong> to comply with tax and financial regulations</span>,
              <span key="c"><Strong>Aggregate analytics</Strong> — retained indefinitely in non-identifying, aggregated form (e.g. &ldquo;median latency in week X&rdquo;)</span>,
            ]} />
          </Section>

          {/* ── 10 ── */}
          <Section id="s10" num="10" title="Security">
            <P>We protect your data using industry-standard controls:</P>
            <UL items={[
              <span key="a"><Strong>In transit</Strong> — TLS 1.3 on all connections</span>,
              <span key="b"><Strong>At rest</Strong> — AES-256 encryption via Supabase</span>,
              <span key="c"><Strong>API keys</Strong> — SHA-256 hashed; we never store plaintext keys</span>,
              <span key="d"><Strong>Passwords</Strong> — Argon2id hashed by Clerk; we never see your password</span>,
              <span key="e"><Strong>Access control</Strong> — Row-Level Security in Postgres; employees access data only to resolve support issues</span>,
            ]} />
            <P>See our <A href="/legal/security">Security page</A> for full details including penetration testing, incident response, and bug bounty information.</P>
            <P>In the event of a data breach affecting your personal data, we will notify you and the relevant supervisory authority within <Strong>72 hours</Strong> as required by GDPR Art.&nbsp;33.</P>
          </Section>

          {/* ── 11 ── */}
          <Section id="s11" num="11" title="Children">
            <P>VesperWise is a B2B product intended for business professionals. We do not knowingly collect personal data from anyone under 16. If you believe a minor has provided us with data, please contact <A href="mailto:privacy@vesperwise.com">privacy@vesperwise.com</A> and we will delete it promptly.</P>
          </Section>

          {/* ── 12 ── */}
          <Section id="s12" num="12" title="Changes & contact">
            <P>We may update this Privacy Policy from time to time. Material changes will be announced at least <Strong>30 days in advance</Strong> by email to your account owner and notice in the product. The &ldquo;last updated&rdquo; date in the banner reflects the most recent revision.</P>
            <H3>Data controller</H3>
            <P>VesperWise Labs, Inc. · 340 Brannan St., 4th fl., San Francisco, CA 94107</P>
            <H3>Data Protection contact</H3>
            <P>
              <A href="mailto:privacy@vesperwise.com">privacy@vesperwise.com</A>
              {" "}— replies come from Abdel-Rahaman directly. We aim to respond within 2 business days.
            </P>
          </Section>

          {/* Doc footer */}
          <div style={{ marginTop: "56px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: T.txtTertiary }}>
            <span>Questions? <A href="mailto:privacy@vesperwise.com">privacy@vesperwise.com</A></span>
            <div style={{ display: "flex", gap: "18px" }}>
              <A href="/terms">Terms →</A>
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
