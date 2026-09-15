"use client";

import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

/* ─── Design tokens ──────────────────────────────────────────── */
const T = {
  bg: "var(--background)",
  bgEl: "var(--card)",
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
  mono: "var(--font-sans)",
  code: "var(--font-code)",
  r: { sm: "4px", md: "6px", lg: "12px", xl: "16px" },
};

const AV = "linear-gradient(135deg,#dfff00 0%,#e8ff40 60%,#818cf8 100%)";

/* ─── Page data ──────────────────────────────────────────────── */
const NUMBERS = [
  { num: "1",        label: "Person on payroll (in a manner of speaking)" },
  { num: "$0",       label: "Outside funding raised", grad: true },
  { num: "1",        unit: " room", label: "Where it all gets made" },
  { num: "v0.1",     label: "Stage · just getting started" },
];

const TIMELINE = [
  { time: "At work",          isNow: false, title: "An idea shows up uninvited", body: <>I&apos;m at my day job, staring at a sales pipeline that nobody could read. Halfway through a boring meeting, a thought won&apos;t leave me alone: <em style={{ color: T.txt }}>this should just be one number.</em> I scribble it on a notepad and try to focus on the meeting. I don&apos;t.</> },
  { time: "That night",       isNow: false, title: "Home, room, laptop, go",      body: <>Get home, eat, open the laptop in my room. By 1 AM there&apos;s a tiny script that prints a number next to a company name. It&apos;s ugly. It works. I buy <code style={{ fontFamily: T.code, fontSize: "13px", padding: "1px 5px", borderRadius: "3px", background: "var(--muted)" }}>vesperwise.com</code> while I should be sleeping.</> },
  { time: "The months after", isNow: false, title: "Evenings, weekends, three rewrites", body: "Day job in the day. VesperWise at night. I throw the whole thing away twice — once because it was slow, once because it was ugly. Friends ask what I'm working on. I say \"a side project,\" which is technically true." },
  { time: "Today",            isNow: true,  title: "Still in the same room. Now you can sign up.", body: <>Still just me. Same desk, same lamp, slightly more confident. If you want in, sign up free — or just email <a href="mailto:support@vesperwise.com" style={{ color: T.txt, textDecoration: "underline", textDecorationColor: T.borderStrong, textUnderlineOffset: "3px" }}>support@vesperwise.com</a>. I&apos;m the one who replies.</> },
];

const PRINCIPLES = [
  { n: "01", title: "Reasoning ships with the number",      desc: "A score with no explanation is a dashboard tile, and dashboard tiles get ignored. Every score includes bounded, schema-validated reasoning anchored to the underlying evidence." },
  { n: "02", title: "Bounded latency, honest coverage",    desc: "Provider calls have explicit timeouts, neutral evidence is reused safely, and missing data lowers coverage instead of silently becoming zero intent." },
  { n: "03", title: "Reps are the customer, not buyers",    desc: "Sales VPs sign the contract; AEs decide whether the tool gets used. Every feature has to pass the \"would a busy rep click this on a Tuesday at 4 PM\" test. Most ideas don't." },
  { n: "04", title: "One score, not seven",                 desc: "Composite scores beat per‑signal scores for the only metric that matters: whether a human acts on them. I'll resist the urge to add a second number until I'm forced to." },
  { n: "05", title: "Sales is a craft, not a queue",        desc: "Autopilot routes, drafts, and notifies — never sends without a human in the loop. I won't ship \"send 1,000 emails in one click.\" Plenty of vendors do; I won't be one of them." },
  { n: "06", title: "If I'm the only person who works here, I'm the only person you email", desc: "Support, sales, security, billing — every reply you get from @vesperwise.com comes from me. When that breaks, it'll be because VesperWise grew. Until then, that's the promise." },
];

const SCOPE = [
  { cls: "now",  color: T.hot,    label: "Now · This month",         title: "Score quality + caching",      desc: "Tightening the funding and tech signals. Bringing p95 first‑score under 1.5 seconds." },
  { cls: "next", color: "#dfff00", label: "Next · This quarter",      title: "Watchlist + Autopilot v2",     desc: "Per‑account alerts in Slack. Conditional branches with AND/OR. Webhook destinations." },
  { cls: "later",color: T.txtQ,   label: "Later · When it makes sense", title: "Hire help",                 desc: "Probably an engineer first. Maybe an AE. Definitely not until the product earns it." },
];

const DESK = [
  ["EDITOR","Cursor"],["TERMINAL","Ghostty"],["BROWSER","Arc"],
  ["DESIGN","Figma"],["NOTES","Obsidian"],["COFFEE","Always on"],
];

const STACK = ["Next.js 16","React 19","Tailwind 4","Supabase","Upstash Redis","Clerk","Polar.sh","OpenRouter","Vercel","Cursor"];

/* ─── Small helpers ──────────────────────────────────────────── */
function SectionHead({ eyebrow, h2, sub }: { eyebrow: string; h2: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ fontSize: "12px", color: T.txtTert, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, marginBottom: "12px" }}>
        <span style={{ color: T.accent, marginRight: "8px" }}>✦</span>{eyebrow}
      </div>
      <h2 style={{ fontSize: "clamp(28px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.028em", lineHeight: 1.15, color: T.txt, marginBottom: sub ? "12px" : 0 }}>{h2}</h2>
      {sub && <p style={{ fontSize: "15px", color: T.txtSec, letterSpacing: "-0.006em" }}>{sub}</p>}
    </div>
  );
}

/* ─── Main view ──────────────────────────────────────────────── */
export default function AboutView() {
  return (
    <div style={{ background: T.bg, color: T.txt, minHeight: "100vh" }}>

      {/* ── Sticky banner ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, height: "36px", background: T.bgEl, borderBottom: `1px solid ${T.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "12px", color: T.txtTert }}>
        <span style={{ background: T.accentBg, color: T.accent, border: `1px solid rgba(223,255,0,0.25)`, borderRadius: "999px", padding: "1px 8px", fontSize: "10px", fontWeight: 600, fontFamily: T.mono }}>v0.1</span>
        <span><strong style={{ color: T.txtSec, fontWeight: 500 }}>Solo founder.</strong> Building VesperWise from a single room — and writing about it as I go.</span>
        <Link href="#" style={{ color: T.txtTert, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "6px" }}>Read the build log <span>→</span></Link>
      </div>

      {/* ── Sticky nav ── */}
      <nav style={{ position: "sticky", top: "36px", zIndex: 40, height: "56px", background: "var(--bg-translucent)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.borderSubtle}`, display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "0 24px", gap: "24px" }}>
          <Link href="/" aria-label="VesperWise home" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <VesperWiseLogo size={42} variant="wordmark" />
          </Link>
          <div className="mkt-navlinks" style={{ display: "flex", gap: "4px" }}>
            {(["Product","Autopilot","Developers","Pricing","Customers","Company"] as const).map(label => (
              <a key={label} href={label === "Company" ? "/about" : label === "Developers" ? "/docs" : "#"} style={{ fontSize: "13px", padding: "5px 10px", borderRadius: T.r.md, color: label === "Company" ? T.txt : T.txtTert, background: label === "Company" ? "var(--muted)" : "transparent", letterSpacing: "-0.006em", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
            <Link href="/login"   style={{ fontSize: "13px", padding: "6px 12px", borderRadius: T.r.md, color: T.txtSec, background: "var(--background)", border: `1px solid ${T.border}`, textDecoration: "none" }}>Sign in</Link>
            <Link href="/contact" style={{ fontSize: "13px", padding: "6px 14px", borderRadius: T.r.md, color: "#000000", background: T.accent, textDecoration: "none", fontWeight: 500 }}>Talk to us →</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", padding: "72px 24px 64px", borderBottom: `1px solid ${T.borderSubtle}`, overflow: "hidden" }}>
        <div style={{ position: "relative", maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ fontSize: "12px", color: T.txtTert, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500, marginBottom: "16px" }}>
            <span style={{ color: T.accent, marginRight: "8px" }}>✦</span>About VesperWise
          </div>
          <h1 style={{ fontSize: "clamp(40px,5.5vw,60px)", fontWeight: 500, letterSpacing: "-0.032em", lineHeight: 1.08, marginBottom: "20px" }}>
            One person.<br />One room.{" "}
            <span style={{ background: "linear-gradient(110deg,#dfff00 0%,#e8ff40 60%,#dfff00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>One number.</span>
          </h1>
          <p style={{ fontSize: "18px", lineHeight: 1.6, color: T.txtSec, maxWidth: "580px", letterSpacing: "-0.008em" }}>
            VesperWise is built by a single founder — Abdel‑Rahaman Rabee — in his own room, in the evenings between a day job and a deadline. The idea came at work. The product is what happened after.
          </p>

          {/* Numbers strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", border: `1px solid ${T.border}`, borderRadius: T.r.xl, background: T.bgEl, overflow: "hidden", marginTop: "48px" }}>
            {NUMBERS.map(({ num, unit, label, grad }, i) => (
              <div key={i} style={{ padding: "24px", borderRight: i < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontWeight: 500, letterSpacing: "-0.03em", fontSize: "30px", lineHeight: 1, marginBottom: "6px", color: T.txt }}>
                  {grad
                    ? <span style={{ background: "linear-gradient(110deg,#dfff00 0%,#e8ff40 60%,#dfff00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{num}</span>
                    : num
                  }
                  {unit && <span style={{ fontSize: "16px", color: T.txtTert, fontWeight: 400 }}>{unit}</span>}
                </div>
                <div style={{ fontSize: "12px", color: T.txtTert, letterSpacing: "-0.006em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Letter from the founder ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{
            border: `1px solid ${T.border}`, borderRadius: T.r.xl,
            background: `radial-gradient(ellipse 80% 60% at 100% 0%,rgba(223,255,0,0.06),transparent 60%),radial-gradient(ellipse 80% 60% at 0% 100%,rgba(223,255,0,0.06),transparent 60%),${T.bgEl}`,
            padding: "44px 48px", position: "relative", overflow: "hidden",
          }}>
            {/* Stamp */}
            <div style={{ position: "absolute", top: "24px", right: "28px", fontFamily: T.mono, fontSize: "10px", color: T.txtQ, letterSpacing: "0.08em", textTransform: "uppercase", border: `1px dashed ${T.borderStrong}`, padding: "6px 10px", borderRadius: "4px", transform: "rotate(2deg)", lineHeight: 1.3, textAlign: "center" }}>
              Built solo<br /><strong style={{ color: T.txtTert, fontWeight: 500 }}>since 2026</strong>
            </div>

            <h2 style={{ fontSize: "clamp(22px,2.4vw,30px)", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: "22px", maxWidth: "640px", color: T.txt }}>
              The idea came to me at work.<br />I went home and started building.
            </h2>

            {[
              <>Hi — I&apos;m <strong style={{ color: T.txt, fontWeight: 500 }}>Abdel‑Rahaman Rabee</strong>. I spent my day job staring at a pipeline that didn&apos;t make any sense. Eight tabs, fifteen filters, a dashboard nobody opened. The &ldquo;intent data&rdquo; we paid five figures a year for was unreadable, and the reps had quietly stopped looking at it.</>,
              <>One afternoon — sitting in a meeting that should have been an email — the thought wouldn&apos;t leave me alone: <em style={{ color: T.txt }}>what if all of this was one number?</em> One score per account, with the reasoning attached. Something a busy rep could glance at and act on. Not a dashboard. A sentence.</>,
              <>That evening I went home, opened my laptop in my own room, and started building. The first version was a Python script and a spreadsheet. The second version was a Postgres table and a half‑broken Next.js app. The version you&apos;re looking at is what happens when you keep going for a year.</>,
              <>I&apos;m doing every part of this myself — the scoring math, the front‑end, the API, the marketing site you&apos;re reading right now, the support emails, the late‑night deploys. There is no team. There are no investors. There&apos;s me, a room, and a deadline I set for myself.</>,
              <>If you&apos;re a seller who&apos;s tired of dashboards, you&apos;re who I&apos;m building for. If something about VesperWise feels off — wording, pricing, the way a score lands — <strong style={{ color: T.txt, fontWeight: 500 }}>email me directly</strong>. The reply you get will be from the only person who works here.</>,
            ].map((para, i) => (
              <p key={i} style={{ fontSize: "16px", lineHeight: 1.7, color: T.txtSec, letterSpacing: "-0.011em", marginBottom: "16px", maxWidth: "640px" }}>{para}</p>
            ))}

            {/* Signoff */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "28px", paddingTop: "24px", borderTop: `1px solid ${T.borderSubtle}` }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "999px", display: "grid", placeItems: "center", fontSize: "13px", fontWeight: 700, color: "rgba(10,11,15,0.85)", fontFamily: T.mono, letterSpacing: "-0.04em", background: AV, flexShrink: 0 }}>AR</div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: T.txt, letterSpacing: "-0.011em", marginBottom: "2px" }}>Abdel‑Rahaman Rabee</div>
                <div style={{ fontSize: "12px", color: T.txtTert, letterSpacing: "-0.006em" }}>Founder · sole everything</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section style={{ paddingBottom: "80px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px" }}>
          <SectionHead eyebrow="The short version" h2={<>From a notepad scribble<br />to whatever this is.</>} />
          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: "139px", top: "14px", bottom: "14px", width: "1px", background: "linear-gradient(180deg,rgba(255,255,255,0.13) 0%,rgba(255,255,255,0.07) 60%,transparent 100%)", pointerEvents: "none" }} />
            {TIMELINE.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr" }}>
                <div style={{ fontFamily: T.mono, fontSize: "12px", color: T.txtTert, letterSpacing: "0.04em", padding: "24px 24px 24px 0", textAlign: "right", position: "relative" }}>
                  {row.time}
                  {/* Dot */}
                  <span style={{ position: "absolute", right: "-5px", top: "32px", width: "9px", height: "9px", borderRadius: "999px", background: row.isNow ? T.cyan : T.bg, border: `1px solid ${row.isNow ? T.cyan : T.borderStrong}`, boxShadow: row.isNow ? `0 0 12px ${T.cyan}` : "none", zIndex: 1, display: "block" }} />
                </div>
                <div style={{ padding: "24px 0 24px 32px", borderBottom: i < TIMELINE.length - 1 ? `1px solid ${T.borderSubtle}` : "none" }}>
                  <h3 style={{ fontSize: "17px", fontWeight: 500, letterSpacing: "-0.011em", marginBottom: "6px", color: T.txt }}>{row.title}</h3>
                  <p style={{ fontSize: "14px", color: T.txtTert, letterSpacing: "-0.006em", lineHeight: 1.55, maxWidth: "520px" }}>{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Principles ── */}
      <section style={{ paddingBottom: "80px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px" }}>
          <SectionHead eyebrow="How I work" h2={<>Six rules I don&apos;t<br />negotiate on.</>} sub="Most of these came from getting them wrong first." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1px", background: T.borderSubtle, border: `1px solid ${T.borderSubtle}`, borderRadius: T.r.xl, overflow: "hidden" }}>
            {PRINCIPLES.map(p => (
              <div key={p.n} style={{ background: T.bg, padding: "28px", display: "flex", gap: "16px" }}>
                <div style={{ fontFamily: T.mono, fontSize: "11px", color: T.txtQ, letterSpacing: "0.06em", flexShrink: 0, paddingTop: "3px" }}>{p.n}</div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.022em", lineHeight: 1.2, color: T.txt, marginBottom: "8px" }}>{p.title}</h3>
                  <p style={{ fontSize: "14px", lineHeight: 1.6, color: T.txtSec, letterSpacing: "-0.006em" }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The founder ── */}
      <section style={{ paddingBottom: "80px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px" }}>
          <SectionHead eyebrow="The team, in full" h2={<>It&apos;s just me.<br /><span style={{ color: T.txtTert }}>For now — on purpose.</span></>} sub="One person ships faster than a roadmap meeting. I'll know when it's time to add a second." />

          {/* Founder card */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", border: `1px solid ${T.border}`, borderRadius: T.r.xl, overflow: "hidden", background: T.bgEl }}>
            {/* Face */}
            <div style={{ position: "relative", background: "radial-gradient(ellipse 80% 80% at 50% 30%,rgba(223,255,0,0.18),transparent 60%),radial-gradient(ellipse 60% 60% at 70% 80%,rgba(223,255,0,0.12),transparent 70%),linear-gradient(135deg,#14171a 0%,#0a0c0e 100%)", display: "grid", placeItems: "center", minHeight: "340px", borderRight: `1px solid ${T.border}` }}>
              <div style={{ width: "160px", height: "160px", borderRadius: "32px", display: "grid", placeItems: "center", fontSize: "56px", fontWeight: 700, letterSpacing: "-0.05em", color: "rgba(10,11,15,0.85)", fontFamily: T.mono, background: AV, boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6)", position: "relative" }}>AR</div>
              {/* Online tag */}
              <div style={{ position: "absolute", bottom: "20px", left: "20px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", background: "rgba(10,11,15,0.6)", border: `1px solid ${T.border}`, borderRadius: "999px", fontFamily: T.mono, fontSize: "10px", color: T.txtTert, letterSpacing: "0.04em", textTransform: "uppercase", backdropFilter: "blur(8px)" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.hot, boxShadow: `0 0 6px ${T.hot}`, display: "inline-block" }} />
                Online · usually shipping
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <h3 style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.028em", lineHeight: 1.1, color: T.txt }}>Abdel‑Rahaman Rabee</h3>
                <div style={{ fontSize: "13px", color: T.txtTert, letterSpacing: "-0.006em", marginTop: "4px" }}>Founder · engineer · designer · support · everything else</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {["Engineering","Product","Design","GTM","Support","Ops"].map(r => (
                  <span key={r} style={{ fontFamily: T.mono, fontSize: "10px", padding: "3px 9px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", color: T.txtSec, border: `1px solid ${T.border}`, letterSpacing: "0.04em", textTransform: "uppercase" }}>{r}</span>
                ))}
              </div>
              <p style={{ fontSize: "15px", lineHeight: 1.65, color: T.txtSec, letterSpacing: "-0.006em", maxWidth: "560px" }}>
                Built VesperWise alone, evenings and weekends, from an idea that arrived during a pipeline review at the day job. <strong style={{ color: T.txt, fontWeight: 500 }}>Every line of code, every pixel on this page, and every reply to support is from me.</strong> Reach out anytime — there&apos;s no triage between us.
              </p>
              {/* Social links */}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", paddingTop: "18px", borderTop: `1px solid ${T.borderSubtle}`, flexWrap: "wrap" }}>
                {[
                  { href: "mailto:support@vesperwise.com", label: "support@vesperwise.com", icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "11px", height: "11px" }}><path d="M2 4l5 4 5-4"/><rect x="1.5" y="3" width="11" height="9" rx="1"/></svg> },
                  { href: "https://x.com/laflame_archive", label: "twitter / X", icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "11px", height: "11px" }}><circle cx="7" cy="7" r="5.5"/><path d="M2 7h10M7 1.5c1.5 2 1.5 9 0 11M7 1.5c-1.5 2-1.5 9 0 11"/></svg> },
                  { href: "https://www.linkedin.com/in/abdel-rahman-rabee-3543011b6/", label: "linkedin", icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "11px", height: "11px" }}><path d="M2 2v10h10V2zM5 6v4M5 4v.01M9 6v4M9 8a1.5 1.5 0 013 0v2"/></svg> },
                  { href: "https://github.com/abdorabee", label: "github", icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "11px", height: "11px" }}><path d="M5 11c-2 0-3-1-3-3.5C2 6 3 5 3 5s0-1 .5-1.5C4 3 5 3.5 5 3.5c.5-.3 2-.3 3 0 0 0 1-.5 1.5 0 .5.5.5 1.5.5 1.5s1 1 1 2.5C11 10 10 11 8 11"/></svg> },
                ].map(({ href, label, icon }) => (
                  <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 10px", fontSize: "12px", color: T.txtTert, background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: T.r.sm, letterSpacing: "-0.006em", textDecoration: "none" }}>
                    {icon}{label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Scope cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "28px" }}>
            {SCOPE.map(s => (
              <div key={s.cls} style={{ border: `1px solid ${s.cls === "now" ? "rgba(74,222,128,0.25)" : s.cls === "next" ? "rgba(223,255,0,0.25)" : T.border}`, background: s.cls === "now" ? "rgba(74,222,128,0.03)" : s.cls === "next" ? "rgba(223,255,0,0.03)" : T.bgEl, borderRadius: T.r.md, padding: "18px 20px" }}>
                <div style={{ fontFamily: T.mono, fontSize: "10px", color: s.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{s.label}</div>
                <h4 style={{ fontSize: "15px", fontWeight: 500, color: T.txt, letterSpacing: "-0.011em", marginBottom: "6px" }}>{s.title}</h4>
                <p style={{ fontSize: "13px", color: T.txtTert, letterSpacing: "-0.006em", lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workshop ── */}
      <section style={{ paddingBottom: "80px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px" }}>
          <SectionHead eyebrow="The workshop" h2={<>A laptop, a desk,<br />and a real deadline.</>} sub="Everything you see ships from one room. Here's what's in it and what it runs on." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* Desk card */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: T.r.xl, background: T.bgEl, padding: "28px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 500, color: T.txt, letterSpacing: "-0.018em" }}>The desk</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: T.txtTert, letterSpacing: "-0.006em" }}>Where the building happens — evenings, weekends, and the occasional 5 AM bug fix that won&apos;t wait.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginTop: "6px" }}>
                {DESK.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: `1px solid ${T.borderSubtle}`, borderRadius: T.r.sm, fontSize: "12px" }}>
                    <span style={{ fontFamily: T.mono, fontSize: "10px", color: T.txtQ, letterSpacing: "0.04em" }}>{k}</span>
                    <span style={{ color: T.txtSec, letterSpacing: "-0.006em", marginLeft: "auto", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Stack card */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: T.r.xl, background: T.bgEl, padding: "28px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 500, color: T.txt, letterSpacing: "-0.018em" }}>The stack</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: T.txtTert, letterSpacing: "-0.006em" }}>The same one any solo dev would reach for in 2026 — small, fast, and easy to wake up at 2 AM if something breaks.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {STACK.map(s => (
                  <span key={s} style={{ fontFamily: T.mono, fontSize: "11px", padding: "3px 9px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", color: T.txtSec, border: `1px solid ${T.border}`, letterSpacing: "0.02em" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", padding: "96px 24px", textAlign: "center", overflow: "hidden", borderTop: `1px solid ${T.borderSubtle}` }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 50%,rgba(223,255,0,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px,4vw,48px)", fontWeight: 500, letterSpacing: "-0.032em", lineHeight: 1.1, marginBottom: "16px", background: "linear-gradient(110deg,#dfff00 0%,#e8ff40 50%,#dfff00 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Try it. Tell me<br />what&apos;s broken.
          </h2>
          <p style={{ fontSize: "16px", color: T.txtSec, letterSpacing: "-0.006em", marginBottom: "32px", lineHeight: 1.6 }}>
            20 free credits, no card. The fastest way to make VesperWise better is to use it and reply to my emails.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "11px 22px", borderRadius: "999px", background: T.accent, color: "#000000", fontWeight: 500, fontSize: "14px", textDecoration: "none", letterSpacing: "-0.006em" }}>
              Start scoring free <span>→</span>
            </Link>
            <a href="mailto:support@vesperwise.com" style={{ display: "inline-flex", alignItems: "center", padding: "11px 22px", borderRadius: "999px", border: `1px solid ${T.border}`, color: T.txtSec, fontSize: "14px", textDecoration: "none", letterSpacing: "-0.006em" }}>
              Email me directly
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
