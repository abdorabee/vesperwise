"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

/* ── Design tokens ───────────────────────────────────────────── */
const T = {
  bg:            "#08090a",
  bgEl:          "#0e1011",
  surface:       "#131517",
  txtPrimary:    "#f7f8f8",
  txtSecondary:  "#b4bbc8",
  txtTertiary:   "#8a8f98",
  txtQuaternary: "#62666d",
  border:        "rgba(255,255,255,0.08)",
  borderStrong:  "rgba(255,255,255,0.13)",
  accent:        "#dfff00",
  accent2:       "#e8ff40",
  cyan:          "#dfff00",
  cyanSoft:      "rgba(223,255,0,0.16)",
  fontSans:      "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  fontMono:      "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

const TOC = [
  { id: "s1",  num: "01", label: "Definitions & roles"       },
  { id: "s2",  num: "02", label: "Subject matter & scope"    },
  { id: "s3",  num: "03", label: "Processing instructions"   },
  { id: "s4",  num: "04", label: "Confidentiality"           },
  { id: "s5",  num: "05", label: "Subprocessors"             },
  { id: "s6",  num: "06", label: "Security measures"         },
  { id: "s7",  num: "07", label: "Personal data breach"      },
  { id: "s8",  num: "08", label: "Data subject rights"       },
  { id: "s9",  num: "09", label: "International transfers"   },
  { id: "s10", num: "10", label: "Audits"                    },
  { id: "s11", num: "11", label: "Deletion & return"         },
  { id: "s12", num: "12", label: "Liability & term"          },
  { id: "a1",  num: "A1", label: "Annex I · Details"         },
  { id: "a2",  num: "A2", label: "Annex II · TOMs"           },
];

const NAV_LINKS = [
  { label: "Product",    href: "/#product"   },
  { label: "Autopilot",  href: "/#autopilot" },
  { label: "Developers", href: "/docs"       },
  { label: "Pricing",    href: "/#pricing"   },
];

/* ── Shared primitives ───────────────────────────────────────── */

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

/* ── DPA-specific components ─────────────────────────────────── */

function DpaActions() {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
      <button style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px", background: "rgba(223,255,0,0.12)", border: "1px solid rgba(223,255,0,0.3)", borderRadius: "999px", color: "#dfff00", fontWeight: 500, letterSpacing: "-0.006em", cursor: "pointer", fontFamily: T.fontSans }}>
        <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
        Download signed PDF
      </button>
      <button style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: "999px", color: T.txtSecondary, fontWeight: 500, letterSpacing: "-0.006em", cursor: "pointer", fontFamily: T.fontSans }}>
        <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h8v6H3zM3 5l4 3 4-3"/></svg>
        Request a counter‑signed copy
      </button>
      <button style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: "999px", color: T.txtSecondary, fontWeight: 500, letterSpacing: "-0.006em", cursor: "pointer", fontFamily: T.fontSans }}>
        <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M5 7l2 2 3-4"/></svg>
        Already accepted at signup
      </button>
    </div>
  );
}

function AnnexGrid({ cards }: { cards: { key: string; val: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", margin: "18px 0" }}>
      {cards.map(({ key, val }) => (
        <div key={key} style={{ border: `1px solid ${T.border}`, borderRadius: "6px", background: "rgba(255,255,255,0.012)", padding: "16px 18px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "10px", color: T.txtQuaternary, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: "6px" }}>{key}</div>
          <div style={{ fontSize: "14px", color: T.txtPrimary, letterSpacing: "-0.006em", lineHeight: 1.5 }}>{val}</div>
        </div>
      ))}
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

/* ── Main component ──────────────────────────────────────────── */

export default function DpaView() {
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
        .pill-btn-hover:hover { border-color: rgba(255,255,255,0.13) !important; color: #f7f8f8 !important; }
      `}</style>

      {/* ── Sticky banner ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: T.txtSecondary, background: "rgba(8,9,10,0.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}`, letterSpacing: "-0.011em", gap: 0 } as React.CSSProperties}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginRight: "10px", fontSize: "11px", fontWeight: 600, color: T.cyan, background: T.cyanSoft, padding: "1px 8px", borderRadius: "999px" }}>v1.6</span>
        <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>Data Processing Agreement</strong>
        <span style={{ margin: "0 6px", color: T.txtQuaternary }}>·</span>
        last updated May 12, 2026
        <span style={{ margin: "0 6px", color: T.txtQuaternary }}>·</span>
        GDPR Art.&nbsp;28
        <span style={{ margin: "0 6px", color: T.txtQuaternary }}>·</span>
        SCCs 2021/914
      </div>

      {/* ── Sticky nav ── */}
      <nav style={{ position: "sticky", top: "36px", zIndex: 50, background: "rgba(8,9,10,0.72)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}` } as React.CSSProperties}>
        <div style={{ display: "flex", alignItems: "center", height: "56px", padding: "0 24px", maxWidth: "1320px", margin: "0 auto", gap: "28px" }}>
          <Link href="/" aria-label="VesperWise home" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600, letterSpacing: "-0.022em", fontSize: "15px", color: T.txtPrimary, textDecoration: "none" }}>
            <VesperWiseLogo size={42} variant="wordmark" />
          </Link>
          <div className="mkt-navlinks" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} style={{ display: "inline-flex", alignItems: "center", fontSize: "14px", color: T.txtSecondary, padding: "6px 10px", borderRadius: "6px", letterSpacing: "-0.011em", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/login" style={{ fontSize: "14px", fontWeight: 500, color: T.txtSecondary, padding: "6px 10px", borderRadius: "6px", textDecoration: "none" }}>Sign in</Link>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", fontSize: "14px", fontWeight: 500, color: T.txtPrimary, padding: "0 14px", height: "32px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>Start free</Link>
          <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500, color: "#000000", padding: "0 14px", height: "32px", borderRadius: "6px", background: T.accent, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 } as React.CSSProperties}>
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
            Legal · Data Processing Agreement
          </div>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            Data Processing<br />Agreement.
          </h1>
          <p style={{ maxWidth: "620px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em" }}>
            The GDPR Article 28 controller‑to‑processor agreement governing how VesperWise handles personal data on your behalf. This DPA is automatically incorporated into our{" "}
            <A href="/terms">Terms of Service</A> for every customer in the EEA, UK, or Switzerland.
          </p>
        </div>
      </section>

      {/* ── Doc shell ── */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "64px", padding: "64px 24px 96px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* TOC sidebar */}
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
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Version</span>v1.6</span>
            <span><span style={{ color: T.txtQuaternary, marginRight: "4px" }}>Incorporates</span><span style={{ color: T.txtSecondary }}>SCCs (EU 2021/914), UK Addendum</span></span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "2px 8px", border: `1px solid ${T.border}`, borderRadius: "999px", background: "rgba(255,255,255,0.02)", color: T.txtSecondary }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan }} />
              In force
            </span>
          </div>

          {/* DPA action buttons */}
          <DpaActions />

          {/* Info callout */}
          <InfoCallout>
            <strong style={{ color: T.txtPrimary, fontWeight: 500 }}>You don&rsquo;t need to sign anything.</strong>{" "}This DPA is automatically incorporated into the Terms of Service when you create an account. If your procurement team requires a counter‑signed copy, email <Code>legal@vesperwise.com</Code> and you&rsquo;ll have a DocuSign within one business day.
          </InfoCallout>

          {/* ── 01 ── */}
          <Section id="s1" num="01" title="Definitions & roles" first>
            <P>Terms not defined here have the meaning given in the <A href="/terms">Terms of Service</A> or the GDPR. For clarity:</P>
            <UL items={[
              <span key="a"><Strong>Controller</Strong> means the Customer (you), who determines the purposes and means of processing Personal Data;</span>,
              <span key="b"><Strong>Processor</Strong> means VesperWise Labs, Inc., processing Personal Data on the Controller&rsquo;s behalf;</span>,
              <span key="c"><Strong>Personal Data</Strong>, <Strong>Processing</Strong>, <Strong>Data Subject</Strong>, <Strong>Supervisory Authority</Strong>, and <Strong>Personal Data Breach</Strong> have the meanings given in GDPR Art. 4;</span>,
              <span key="d"><Strong>SCCs</Strong> means the EU Standard Contractual Clauses, Module Two (Controller → Processor), Commission Decision 2021/914.</span>,
            ]} />
          </Section>

          {/* ── 02 ── */}
          <Section id="s2" num="02" title="Subject matter & scope">
            <P>This DPA applies to all Processing of Personal Data carried out by VesperWise in performance of the Service. The subject matter, duration, nature, and categories of data are described in <A href="#a1">Annex I</A>. This DPA prevails over the Terms with respect to any inconsistency in the handling of Personal Data.</P>
          </Section>

          {/* ── 03 ── */}
          <Section id="s3" num="03" title="Processing instructions">
            <P>VesperWise will Process Personal Data only on documented instructions from the Controller — including with regard to international transfers — unless required to do so by EU or Member State law. The Controller&rsquo;s documented instructions are:</P>
            <OL items={[
              <span key="a">The Terms of Service;</span>,
              <span key="b">This DPA, including its Annexes;</span>,
              <span key="c">The configuration and inputs the Controller provides through the Service (e.g. domains submitted, workflows enabled).</span>,
            ]} />
            <P>If VesperWise is required by law to Process Personal Data outside these instructions, it will inform the Controller of that legal requirement before Processing, unless the law prohibits such notice on important grounds of public interest.</P>
          </Section>

          {/* ── 04 ── */}
          <Section id="s4" num="04" title="Confidentiality & personnel">
            <P>VesperWise ensures that any person authorized to Process Personal Data is bound by an obligation of confidentiality and has received appropriate data‑protection training. Access to Personal Data is granted on a least‑privilege basis and reviewed quarterly.</P>
          </Section>

          {/* ── 05 ── */}
          <Section id="s5" num="05" title="Subprocessors">
            <P>The Controller grants general authorization for VesperWise to engage subprocessors. The current list is on our <A href="/legal/subprocessors">Subprocessors</A> page. VesperWise will:</P>
            <UL items={[
              <span key="a">Notify the Controller at least <Strong>30 days in advance</Strong> before adding or replacing a subprocessor (by email to the account owner, and by an update to the Subprocessors page);</span>,
              "Impose on each subprocessor data‑protection obligations no less protective than those in this DPA;",
              "Remain fully liable for the acts and omissions of its subprocessors.",
            ]} />
            <P>The Controller may object to a new subprocessor on reasonable data‑protection grounds within the notice period; if the parties cannot resolve the objection, the Controller may terminate the affected services and receive a prorated refund of prepaid fees.</P>
          </Section>

          {/* ── 06 ── */}
          <Section id="s6" num="06" title="Security measures">
            <P>VesperWise implements appropriate technical and organizational measures (&ldquo;TOMs&rdquo;) to ensure a level of security appropriate to the risk, including those listed in <A href="#a2">Annex II</A>. The Controller acknowledges that the measures in Annex II constitute appropriate security for the categories of Personal Data described in Annex I.</P>
          </Section>

          {/* ── 07 ── */}
          <Section id="s7" num="07" title="Personal data breach">
            <P>VesperWise will notify the Controller without undue delay, and in any event <Strong>within 72 hours</Strong> of becoming aware of a Personal Data Breach affecting the Controller&rsquo;s data. The notification will include:</P>
            <OL items={[
              "A description of the nature of the breach, including categories and approximate numbers of Data Subjects and records concerned;",
              "The likely consequences;",
              "Measures taken or proposed to address the breach and mitigate possible adverse effects;",
              <span key="d">The point of contact for further information (<Code>security@vesperwise.com</Code>).</span>,
            ]} />
          </Section>

          {/* ── 08 ── */}
          <Section id="s8" num="08" title="Data subject rights">
            <P>VesperWise will, taking into account the nature of the Processing, assist the Controller by appropriate technical and organizational measures (insofar as possible) in fulfilling its obligation to respond to requests by Data Subjects exercising their rights under Chapter III GDPR.</P>
            <P>If VesperWise receives a request from a Data Subject in respect of Personal Data Processed under this DPA, it will direct the Data Subject to the Controller without responding to the request itself, except where required by law.</P>
          </Section>

          {/* ── 09 ── */}
          <Section id="s9" num="09" title="International transfers">
            <P>To the extent that Processing under this DPA involves the transfer of Personal Data out of the EEA, UK, or Switzerland to a country not covered by an adequacy decision, the parties enter into the SCCs (Module Two), incorporated herein by reference:</P>
            <UL items={[
              <span key="a"><Strong>Clause 7</Strong> (docking clause): not used;</span>,
              <span key="b"><Strong>Clause 9</Strong> (subprocessors): Option 2 (general written authorization), 30‑day notice;</span>,
              <span key="c"><Strong>Clause 11</Strong> (redress): independent dispute resolution body not used;</span>,
              <span key="d"><Strong>Clause 17</Strong> (governing law): law of Ireland;</span>,
              <span key="e"><Strong>Clause 18</Strong> (forum): courts of Ireland;</span>,
              <span key="f"><Strong>Annex I.A</Strong> populated from <A href="#a1">Annex I</A> of this DPA;</span>,
              <span key="g"><Strong>Annex II</Strong> populated from <A href="#a2">Annex II</A> of this DPA.</span>,
            ]} />
            <P>For UK transfers, the <Strong>UK International Data Transfer Addendum</Strong> (Version B1.0) supplements the SCCs as drafted by the ICO.</P>
          </Section>

          {/* ── 10 ── */}
          <Section id="s10" num="10" title="Audits">
            <P>VesperWise will make available to the Controller all information necessary to demonstrate compliance with this DPA, including a current SOC 2 Type II report and the answers to the CAIQ Lite and SIG Core. The Controller may request an audit once per twelve‑month period, on 30 days notice, conducted during business hours, by a mutually agreed independent auditor bound by confidentiality. The Controller bears the cost unless the audit reveals material non‑compliance.</P>
          </Section>

          {/* ── 11 ── */}
          <Section id="s11" num="11" title="Deletion & return">
            <P>Upon termination of the Service, VesperWise will, at the Controller&rsquo;s choice:</P>
            <UL items={[
              "Return all Personal Data via a JSON export available in‑product;",
              <span key="b">Delete all Personal Data within <Strong>90 days</Strong>, including from backups within their normal rotation schedule (≤ 35 additional days), and provide written confirmation;</span>,
            ]} />
            <P>Unless retention of some Personal Data is required by Union or Member State law (e.g. tax records). In that case, VesperWise will continue to ensure the confidentiality of the retained data and will not actively Process it.</P>
          </Section>

          {/* ── 12 ── */}
          <Section id="s12" num="12" title="Liability & term">
            <P>The liability of each party under this DPA is subject to the limitations and exclusions of liability set out in the Terms of Service. This DPA enters into force on the effective date stated above and remains in effect for the duration of the Service.</P>
          </Section>

          {/* ── Annex I ── */}
          <Section id="a1" num="A1" title="Annex I · Details of Processing">
            <P><Strong>A. List of Parties.</Strong> Controller: the Customer as identified in the account record. Processor: VesperWise Labs, Inc., 340 Brannan St., 4th fl., San Francisco, CA 94107.</P>
            <AnnexGrid cards={[
              { key: "Subject matter",                val: "Provision of B2B intent scoring, workflows, and chat copilot via the VesperWise Service." },
              { key: "Duration",                      val: "Term of the Service plus the 90‑day deletion window in Section 11." },
              { key: "Nature & purpose",              val: "Account scoring, person scoring, watchlist alerts, AI summary generation, billing." },
              { key: "Categories of Data Subjects",   val: "Customer's employees (seat holders); business contacts (e.g. people the Customer scores)." },
              { key: "Categories of Personal Data",   val: "Name, work email, professional title, employer, LinkedIn URL, IP address, account activity." },
              { key: "Special categories",            val: "None. Processing of Article 9 data is prohibited by the AUP." },
              { key: "Frequency",                     val: "Continuous, throughout the Term." },
              { key: "Competent supervisory authority", val: "Data Protection Commission of Ireland (lead authority for EEA transfers)." },
            ]} />
          </Section>

          {/* ── Annex II ── */}
          <Section id="a2" num="A2" title="Annex II · Technical & organizational measures">
            <P>VesperWise implements the following measures. The full Security page, including diagrams and control mappings, is at <A href="/legal/security">vesperwise.com/security</A>.</P>
            <DocTable
              headers={["Control area", "Measure"]}
              rows={[
                ["Encryption · transit",       "TLS 1.3 on all customer‑facing endpoints; HSTS preloaded."],
                ["Encryption · at rest",        "AES‑256 for database and object storage (Supabase + Vercel Blob)."],
                ["Access control",              "SSO + MFA enforced for all internal access. Least‑privilege RBAC; quarterly access review."],
                ["API authentication",          <span key="api">SHA‑256 hashed bearer tokens; per‑user rate limiting; revocation on suspected compromise.</span>],
                ["Tenant isolation",            "Postgres Row‑Level Security on every multi‑tenant table; tenant ID required on all queries."],
                ["Logging & monitoring",        "Audit logs for all admin actions; 12‑month retention; alerts on anomalous read volume."],
                ["Vulnerability management",    "Dependabot for dependencies; quarterly third‑party pen test; bounties via the Security page."],
                ["Personnel security",          "Confidentiality agreements; security training on hire and annually."],
                ["Subprocessor management",     "Public list; 30‑day notice; DPA required from each."],
                ["Incident response",           "72‑hour Controller notification on breach; runbook tested twice per year."],
                ["Backups & resilience",        "Daily encrypted backups; 35‑day retention; RPO 24h, RTO 4h."],
                ["Physical security",           "None operated by VesperWise; all production hosting is with subprocessors with SOC 2 / ISO 27001."],
              ]}
            />
          </Section>

          {/* Doc footer */}
          <div style={{ marginTop: "56px", paddingTop: "24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: T.txtTertiary }}>
            <span>Questions? <A href="mailto:legal@vesperwise.com">legal@vesperwise.com</A></span>
            <div style={{ display: "flex", gap: "18px" }}>
              <A href="/terms">Terms →</A>
              <A href="/privacy">Privacy →</A>
              <A href="/legal/subprocessors">Subprocessors →</A>
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
