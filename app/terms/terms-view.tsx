"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

/* ── Design tokens (matching chrome.css + doc.css) ─────────── */
const T = {
  bg:          "#08090a",
  bgEl:        "#0e1011",
  surface:     "#131517",
  txtPrimary:  "#f7f8f8",
  txtSecondary:"#b4bbc8",
  txtTertiary: "#8a8f98",
  txtQuaternary:"#62666d",
  border:      "rgba(255,255,255,0.08)",
  borderStrong:"rgba(255,255,255,0.13)",
  accent:      "#dfff00",
  accent2:     "#e8ff40",
  cyan:        "#dfff00",
  cyanSoft:    "rgba(223,255,0,0.16)",
  fontSans:    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

const TOC = [
  { id: "s1",  num: "01", label: "Acceptance & changes" },
  { id: "s2",  num: "02", label: "Account & access" },
  { id: "s3",  num: "03", label: "Plans, credits & billing" },
  { id: "s4",  num: "04", label: "Acceptable use" },
  { id: "s5",  num: "05", label: "Customer data & IP" },
  { id: "s6",  num: "06", label: "AI features" },
  { id: "s7",  num: "07", label: "Warranties" },
  { id: "s8",  num: "08", label: "Limitation of liability" },
  { id: "s9",  num: "09", label: "Indemnity" },
  { id: "s10", num: "10", label: "Termination" },
  { id: "s11", num: "11", label: "Disputes & governing law" },
  { id: "s12", num: "12", label: "General provisions" },
];

const NAV_LINKS = [
  { label: "Product",    href: "/#product"   },
  { label: "Autopilot",  href: "/#autopilot" },
  { label: "Developers", href: "/docs"       },
  { label: "Pricing",    href: "/#pricing"   },
];

/* ── Primitives matching doc.css exactly ───────────────────── */

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

function WarnCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "20px 0", padding: "14px 16px", borderRadius: "6px", background: "rgba(245,181,68,0.04)", border: "1px solid rgba(245,181,68,0.18)", fontSize: "14px", lineHeight: 1.55, color: T.txtSecondary, display: "flex", gap: "12px" }}>
      <svg style={{ width: "18px", height: "18px", flexShrink: 0, color: "#f5b544", marginTop: "1px" }} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 2L1 16h16z" /><path d="M9 7v4M9 13h.01" />
      </svg>
      <div>{children}</div>
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

function P({ children, caps }: { children: React.ReactNode; caps?: boolean }) {
  return (
    <p style={{ marginBottom: "14px", lineHeight: 1.65, letterSpacing: caps ? "0.01em" : "-0.006em", color: T.txtSecondary, fontSize: caps ? "13px" : "15px", textWrap: "pretty" as never }}>
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

export default function TermsView() {
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginRight: "10px", fontSize: "11px", fontWeight: 600, color: T.cyan, background: T.cyanSoft, padding: "1px 8px", borderRadius: "999px" }}>v3.1</span>
        <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>Terms of Service</strong>
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
            Legal · Terms of Service
          </div>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            Terms of Service.
          </h1>
          <p style={{ maxWidth: "620px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em" }}>
            The contract between VesperWise Labs, Inc. (&ldquo;VesperWise&rdquo;, &ldquo;we&rdquo;) and the company or
            individual using our products (the &ldquo;Customer&rdquo;, &ldquo;you&rdquo;). Written by a real lawyer;
            edited so a human can read it.
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
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Version</span>v3.1</span>
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Supersedes</span>v3.0 (Jan 4, 2026)</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "2px 8px", border: `1px solid ${T.border}`, borderRadius: "999px", background: "rgba(255,255,255,0.02)", color: T.txtSecondary }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan }} />
              In force
            </span>
          </div>

          {/* Short-version callout */}
          <InfoCallout>
            <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>The short version.</strong>{" "}Use VesperWise for B2B sales
            work. Don&rsquo;t scrape it, train models on it, or break the law with it. Your data stays yours; we&rsquo;ll
            handle it under the <A href="/legal/dpa">DPA</A>. Either side can leave with 30 days notice on monthly plans,
            anytime on annual at renewal.
          </InfoCallout>

          {/* ── 01 ── */}
          <Section id="s1" num="01" title="Acceptance & changes" first>
            <P>By creating an account, accessing the VesperWise API, or using any VesperWise product (collectively, the <Strong>&ldquo;Service&rdquo;</Strong>), you agree to these Terms. If you&rsquo;re agreeing on behalf of a company, you represent that you have authority to do so, and &ldquo;you&rdquo; refers to that company.</P>
            <P>We may update these Terms periodically. Material changes will be announced at least <Strong>30 days in advance</Strong> by email to your account owner and notice in the product. Continued use after the effective date constitutes acceptance. If you don&rsquo;t agree to a change, you may terminate per Section&nbsp;10.</P>
          </Section>

          {/* ── 02 ── */}
          <Section id="s2" num="02" title="Account & access">
            <P>You need a verified work email to create an account. You agree to provide accurate information, keep credentials confidential, and notify us promptly at <A href="mailto:security@vesperwise.com">security@vesperwise.com</A> of any suspected unauthorized access. You are responsible for activity under your account, including activity by your seat holders.</P>
            <P>API keys are bearer credentials. Treat them like passwords. We hash all keys at rest (SHA&#8209;256) and never log key material in plaintext. We may rotate or revoke any key on credible suspicion of compromise.</P>
          </Section>

          {/* ── 03 ── */}
          <Section id="s3" num="03" title="Plans, credits & billing">
            <H3>Subscriptions</H3>
            <P>Plans are billed monthly or annually in advance. Credits reset on each renewal (and on plan changes per Section&nbsp;3.3). Unused monthly credits do not roll over; unused annual credits do not roll over past renewal.</P>
            <H3>One&#8209;time top&#8209;ups</H3>
            <P>Top&#8209;ups add credits without changing your plan and don&rsquo;t expire until your account is closed.</P>
            <H3>Plan changes</H3>
            <P>Upgrades take effect immediately and reset your credit balance to the new plan&rsquo;s allocation, prorated against the days remaining in the cycle. Downgrades take effect at next renewal. We don&rsquo;t refund unused credits on downgrade.</P>
            <H3>Taxes</H3>
            <P>Stated fees exclude VAT, GST and other applicable taxes, which are added at checkout based on your billing address. You are responsible for any withholding taxes; fees due to VesperWise are payable in full.</P>
            <H3>Late payment</H3>
            <P>If a payment fails, we&rsquo;ll retry for 14 days, then suspend the account. Suspended accounts can be reinstated by paying the outstanding invoice. Data is retained for 90 days from suspension before deletion.</P>
          </Section>

          {/* ── 04 ── */}
          <Section id="s4" num="04" title="Acceptable use">
            <P>You will not, and will not permit anyone to:</P>
            <UL items={[
              "Reverse engineer, decompile, or attempt to derive the source code of the Service;",
              "Use the Service to score persons or accounts in jurisdictions where doing so violates applicable law;",
              <span key="r">Use the Service for credit scoring, employment eligibility, housing, insurance, healthcare, or any decision producing legal or similarly significant effects on a natural person (collectively, <Strong>&ldquo;Restricted Uses&rdquo;</Strong>);</span>,
              "Resell, sublicense, or expose the Service as a substantially similar product to third parties without a written reseller agreement;",
              "Use the Service to train, fine‑tune, or evaluate a third‑party machine learning model;",
              "Send malicious content, conduct security tests without prior written consent, or interfere with the integrity of the Service;",
              "Process special categories of personal data (Article 9 GDPR) through the Service.",
            ]} />
            <P>We reserve the right to suspend access for material breach of this Section after written notice and a 7&#8209;day cure period — or immediately for activity that creates an active security or legal risk.</P>
          </Section>

          {/* ── 05 ── */}
          <Section id="s5" num="05" title="Customer data & IP">
            <P><Strong>You own your data.</Strong> &ldquo;Customer Data&rdquo; means any data you upload to, transmit through, or generate within the Service — including domains, account lists, CRM exports, watchlists, and workflow definitions. You grant VesperWise a worldwide, royalty&#8209;free license to host, process, transmit, and display Customer Data solely to provide and improve the Service for you.</P>
            <P><Strong>We will never:</Strong></P>
            <UL items={[
              "Sell, share, or rent Customer Data to third parties;",
              "Train foundation models on Customer Data;",
              "Use Customer Data for any purpose other than providing the Service to you and your seat holders.",
            ]} />
            <P><Strong>We own our IP.</Strong> VesperWise retains all right, title and interest in the Service, including the scoring models, the user interface, and all derived signal weighting, freshness decay, and band logic. You may not copy any of it.</P>
            <P>Aggregated, anonymized metrics (e.g. &ldquo;median first&#8209;score latency&rdquo;, &ldquo;% of accounts in HOT band across all customers&rdquo;) may be used by VesperWise in research, blog posts, and benchmarks — never in a way that identifies you or your accounts.</P>
          </Section>

          {/* ── 06 ── */}
          <Section id="s6" num="06" title="AI features">
            <P>The Service uses third&#8209;party AI providers (currently Anthropic) to generate score summaries, recommended actions, and chat copilot responses (collectively, <Strong>&ldquo;AI Output&rdquo;</Strong>). AI Output:</P>
            <OL items={[
              "Is not warranted to be accurate, complete, or fit for any decision with legal or similarly significant effects;",
              "May contain factual errors or hallucinations — review before relying on it;",
              "Is not sent to the AI provider for training; we enforce zero‑retention modes where available.",
            ]} />
            <P>You can opt your account out of AI features entirely in Settings → AI. Doing so will replace AI summaries with the underlying signal data.</P>
            <WarnCallout>
              <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>Restricted uses, restated.</strong>{" "}Do not use AI Output (or the underlying scores) for hiring, lending, insurance underwriting, housing decisions, healthcare, or any decision that affects an individual&rsquo;s legal rights. The Service is built for B2B sales prioritization; it is not a regulated decisioning system.
            </WarnCallout>
          </Section>

          {/* ── 07 ── */}
          <Section id="s7" num="07" title="Warranties">
            <P>VesperWise warrants that the Service will perform materially in accordance with our published documentation and the SLAs in your order form (if any). Your exclusive remedy for a warranty breach is the SLA service credit described therein, or termination per Section&nbsp;10.</P>
            <P caps>EXCEPT AS EXPRESSLY STATED, THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTY OF ANY KIND. VESPERWISE DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON&#8209;INFRINGEMENT.</P>
          </Section>

          {/* ── 08 ── */}
          <Section id="s8" num="08" title="Limitation of liability">
            <P caps>TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUES, OR DATA, ARISING OUT OF OR RELATING TO THIS AGREEMENT.</P>
            <P caps>EACH PARTY&rsquo;S TOTAL CUMULATIVE LIABILITY UNDER THIS AGREEMENT WILL NOT EXCEED THE GREATER OF (A) THE FEES PAID OR PAYABLE BY YOU IN THE 12 MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR (B) $100.</P>
            <P>The limitations above do not apply to: (i) your payment obligations, (ii) breaches of Section&nbsp;5 (Customer Data &amp; IP) or Section&nbsp;4 (Acceptable Use), or (iii) indemnity obligations under Section&nbsp;9.</P>
          </Section>

          {/* ── 09 ── */}
          <Section id="s9" num="09" title="Indemnity">
            <P><Strong>VesperWise will defend you</Strong> against any third&#8209;party claim that your authorized use of the Service infringes a valid patent, copyright, or trademark, and pay damages awarded in a final judgment or settlement we approve in writing.</P>
            <P><Strong>You will defend VesperWise</Strong> against any third&#8209;party claim arising out of your Customer Data, your use of the Service in violation of Section&nbsp;4, or your use of AI Output for a Restricted Use.</P>
            <P>The defending party&rsquo;s obligations are conditioned on the other party (a) promptly notifying it of the claim, (b) giving it sole control of the defense, and (c) reasonably cooperating.</P>
          </Section>

          {/* ── 10 ── */}
          <Section id="s10" num="10" title="Termination">
            <P>Either party may terminate this Agreement:</P>
            <UL items={[
              <span key="c"><Strong>For convenience</Strong> — monthly plans, on 30 days written notice; annual plans, at the end of the current term;</span>,
              <span key="f"><Strong>For cause</Strong> — if the other party materially breaches and fails to cure within 30 days of written notice; immediately for breaches that cannot be cured (e.g. Restricted Use).</span>,
            ]} />
            <P>On termination, your access ends and we delete Customer Data within 90 days. Sections that by their nature should survive — including 5, 7, 8, 9, 11, and 12 — survive termination.</P>
          </Section>

          {/* ── 11 ── */}
          <Section id="s11" num="11" title="Disputes & governing law">
            <P>This Agreement is governed by the laws of the State of Delaware, without regard to conflicts of laws. The parties consent to exclusive jurisdiction in the state and federal courts located in New Castle County, Delaware.</P>
            <P>Before filing suit, both parties agree to attempt resolution through good&#8209;faith discussion for at least 30 days, beginning when one party sends written notice describing the dispute.</P>
            <P caps>EACH PARTY WAIVES THE RIGHT TO A TRIAL BY JURY. CLASS ACTIONS ARE NOT PERMITTED.</P>
          </Section>

          {/* ── 12 ── */}
          <Section id="s12" num="12" title="General provisions">
            <H3>Entire agreement</H3>
            <P>These Terms, together with the <A href="/legal/dpa">DPA</A>, <A href="/privacy">Privacy Policy</A>, and any signed order form, constitute the entire agreement between us and supersede all prior agreements on the subject.</P>
            <H3>Assignment</H3>
            <P>Neither party may assign this Agreement without the other&rsquo;s prior written consent, except in connection with a merger, acquisition, or sale of substantially all assets, on notice.</P>
            <H3>Notices</H3>
            <P>Legal notices must be sent to <Code>legal@vesperwise.com</Code> (to us) or your account&#8209;owner email (to you). Notices are deemed received the next business day.</P>
            <H3>Force majeure</H3>
            <P>Neither party is liable for delay or failure due to events beyond reasonable control (acts of war, pandemic, internet outage at an upstream provider, etc.).</P>
            <H3>Severability</H3>
            <P>If any provision is held unenforceable, the rest of the Agreement remains in effect.</P>
            <H3>No waiver</H3>
            <P>Failure to enforce a provision is not a waiver of the right to enforce it later.</P>
          </Section>

          {/* Doc footer */}
          <div style={{ marginTop: "56px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: T.txtTertiary }}>
            <span>Questions? <A href="mailto:legal@vesperwise.com">legal@vesperwise.com</A></span>
            <div style={{ display: "flex", gap: "18px" }}>
              <A href="/privacy">Privacy →</A>
              <A href="/legal/dpa">DPA →</A>
              <A href="/legal/security">Security →</A>
            </div>
          </div>
        </main>
      </div>{/* /doc shell grid */}

      <SiteFooter />

    </div>
  );
}
