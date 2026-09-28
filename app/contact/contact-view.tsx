"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateContactForm, type ContactFormErrors } from "@/lib/contact-form";
import SiteFooter from "@/components/site-footer";
import { CONTACT_REASONS as REASONS, type ContactReasonId } from "@/lib/contact";
import MarketingNav from "@/components/landing/marketing-nav";

/* ── Design tokens ───────────────────────────────────────────── */
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
  accent:        "var(--brand)",
  accent2:       "var(--brand-hover)",
  cyan:          "var(--brand)",
  cyanSoft:      "var(--brand-soft)",
  hot:           "#4ade80",
  warm:          "#f5b544",
  fontSans:      "var(--font-sans)",
  fontMono:      "var(--font-sans)",
};

const CHANNELS = [
  {
    type: "sales",
    label: "Sales · Demos",
    name: "Talk to the founder",
    desc: "Plan sizing, multi-seat pricing, and security questions. One person replies.",
    email: "sales@vesperwise.com",
    color: { bg: "rgba(223,255,0,0.12)", fg: "#dfff00" },
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M3 5l6 5 6-5"/><rect x="2" y="4" width="14" height="11" rx="1.5"/>
      </svg>
    ),
  },
  {
    type: "support",
    label: "Product support",
    name: "For paying customers",
    desc: "Bugs, billing, integrations. Reply within one business day.",
    email: "support@vesperwise.com",
    color: { bg: "rgba(223,255,0,0.12)", fg: T.cyan },
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <circle cx="9" cy="9" r="7"/><path d="M9 5v4l3 1"/>
      </svg>
    ),
  },
  {
    type: "security",
    label: "Security · Trust",
    name: "Vulnerability reports and the DPA",
    desc: "Email a report. We don't have a SOC 2 report or a bug bounty yet.",
    email: "security@vesperwise.com",
    color: { bg: "rgba(74,222,128,0.10)", fg: T.hot },
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M9 2L3 4v5c0 4 6 7 6 7s6-3 6-7V4z"/><path d="M6.5 9l2 2 3-4"/>
      </svg>
    ),
  },
  {
    type: "press",
    label: "Press · Analyst",
    name: "Press questions",
    desc: "Email and the founder replies. There is no press kit or exec photo set.",
    email: "support@vesperwise.com",
    color: { bg: "rgba(245,181,68,0.10)", fg: T.warm },
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M3 5h12v9H3z"/><path d="M6 8h6M6 11h4"/>
      </svg>
    ),
  },
  {
    type: "partners",
    label: "Partnerships",
    name: "Integrations, resellers, agencies",
    desc: "If you build for sales teams, we'd like to meet.",
    email: "sales@vesperwise.com",
    color: { bg: "rgba(138,143,152,0.10)", fg: "#8a8f98" },
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <circle cx="6" cy="9" r="3"/><circle cx="12" cy="9" r="3"/>
      </svg>
    ),
  },
];

const TEAM_SIZES = ["1 – 10", "10 – 50", "50 – 200", "200 – 1,000", "1,000+"];

const FAQS = [
  {
    q: "Can I try VesperWise without giving you a credit card?",
    a: "Yes. The Free tier gives you 20 account scores, full dashboard access, and AI summaries on every score. No card. If you want more, Starter is $29/mo with no annual commitment.",
  },
  {
    q: "Do you have a security questionnaire pre‑filled?",
    a: "Email security@vesperwise.com. You'll get the security page and the DPA. We don't have a SOC 2 report or a pre-filled CAIQ.",
  },
  {
    q: "How long does an enterprise rollout typically take?",
    a: "Most teams are live inside two weeks — usually four working days for a 25–50 seat team, plus a week for SSO + HubSpot/Salesforce mapping. The longest part is usually procurement.",
  },
  {
    q: "Can we BYO Anthropic key for AI reasoning?",
    a: "On Pro and Agency, yes. Drop your Anthropic key into Settings → AI and we'll route all summary + chat copilot calls through your account. Useful for AUP scope, billing consolidation, and model‑choice control.",
  },
  {
    q: "Where is customer data stored, and can I pick a region?",
    a: "Primary stack on Vercel (us‑east‑1) + Supabase (us‑east‑1) today. EU region (Frankfurt) ships Q3 2026 — Pro and Agency customers can opt in. See the Security page for the full data map.",
  },
];

/* ── FAQ accordion item ──────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{ border: `1px solid ${open ? T.borderStrong : T.border}`, borderRadius: "8px", padding: "18px 22px", cursor: "pointer", background: T.bgEl, transition: "border-color 0.15s", marginBottom: "1px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <span style={{ fontSize: "15px", fontWeight: 500, color: T.txtPrimary, letterSpacing: "-0.011em" }}>{q}</span>
        <svg
          style={{ width: "14px", height: "14px", color: T.txtTertiary, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <path d="M3 4.5l3 3 3-3"/>
        </svg>
      </div>
      {open && (
        <p style={{ marginTop: "14px", fontSize: "14px", color: T.txtSecondary, letterSpacing: "-0.006em", lineHeight: 1.6, maxWidth: "720px" }}>
          {a}
        </p>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function ContactView() {
  const [reason, setReason]   = useState<ContactReasonId>("demo");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("10 – 50");
  const [message, setMessage] = useState("");
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors]   = useState<ContactFormErrors>({});
  const [serverError, setServerError] = useState("");
  const router = useRouter();

  function clearError(field: keyof ContactFormErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading" || status === "success") return;

    const nextErrors = validateContactForm({ name, email, message });
    setErrors(nextErrors);
    const firstInvalid = (["name", "email", "message"] as const).find((f) => nextErrors[f]);
    if (firstInvalid) {
      e.currentTarget.querySelector<HTMLElement>(`#contact-${firstInvalid}`)?.focus();
      return;
    }

    setStatus("loading");
    setServerError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, name: name.trim(), email: email.trim(), company, teamSize, message }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setServerError(
          res.status === 400
            ? "Some details look off — please check the form and try again."
            : data?.error ?? "Something went wrong on our side."
        );
        setStatus("error");
        return;
      }
      setStatus("success");
      window.gtag?.("event", "generate_lead", { form: "contact", reason });
      router.push("/thank-you");
    } catch {
      setServerError("We couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  const fieldError = (field: keyof ContactFormErrors) =>
    errors[field] ? (
      <p id={`contact-${field}-error`} role="alert" style={{ marginTop: "6px", fontSize: "12px", color: "#f87171", letterSpacing: "-0.006em" }}>
        {errors[field]}
      </p>
    ) : null;

  const errorBorder = (field: keyof ContactFormErrors): React.CSSProperties =>
    errors[field] ? { borderColor: "#f87171" } : {};

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "38px",
    padding: "0 14px",
    border: `1px solid ${T.border}`,
    borderRadius: "6px",
    background: T.bg,
    color: T.txtPrimary,
    fontSize: "14px",
    fontFamily: T.fontSans,
    letterSpacing: "-0.006em",
    outline: "none",
    appearance: "none" as const,
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ background: T.bg, color: T.txtPrimary, fontFamily: T.fontSans, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" } as React.CSSProperties}>
      <style>{`
        html { scroll-behavior: smooth; }
        .ch-card:hover { border-color: var(--border-strong) !important; background: var(--muted) !important; }
        .ch-card:hover .ch-arrow { color: var(--foreground) !important; transform: translateX(2px) !important; }
        .nav-link-hover:hover { color: var(--foreground) !important; background: var(--muted) !important; }
        .field-input:focus { border-color: #dfff00 !important; background: rgba(223,255,0,0.04) !important; }
        .field-input::placeholder { color: #62666d; }
        .reason-chip { transition: border-color 0.15s, background 0.15s, color 0.15s; }
        .reason-chip:hover:not(.active) { border-color: var(--border-strong) !important; }
        .faq-item:hover { border-color: var(--border-strong) !important; }
      `}</style>

      <MarketingNav />

      {/* ── Hero ── */}
      <section style={{ position: "relative", padding: "88px 0 64px", overflow: "hidden", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
          <div style={{ position: "absolute", left: "50%", top: "-200px", width: "1100px", height: "560px", transform: "translateX(-50%)", background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(223,255,0,0.20), transparent 60%), radial-gradient(ellipse 40% 70% at 30% 30%, rgba(223,255,0,0.13), transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)" } as React.CSSProperties} />
        </div>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500, color: T.txtSecondary, letterSpacing: "-0.011em", marginBottom: "22px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan, boxShadow: "0 0 8px #dfff00", display: "block" }} />
            Contact
          </div>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1.05, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            The fastest way<br />to reach us.
          </h1>
          <p style={{ maxWidth: "560px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em" }}>
            Five channels. The right one is whichever gets a human to your problem fastest. Every message gets a reply from a real person within one business day.
          </p>
        </div>
      </section>

      {/* ── Contact shell: 2-col grid ── */}
      <div id="contact-form" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "56px", padding: "64px 24px 96px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* LEFT: channels */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.022em", color: T.txtPrimary, marginBottom: "6px" }}>Pick a channel.</h2>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "28px", maxWidth: "420px" }}>
            Each one routes to a real person — not a queue, not a ticketing system that won&rsquo;t reply for nine days.
          </p>

          {CHANNELS.map((ch) => (
            <a
              key={ch.type}
              href={`mailto:${ch.email}`}
              className="ch-card"
              style={{ border: `1px solid ${T.border}`, borderRadius: "8px", background: T.bgEl, padding: "18px 20px", display: "grid", gridTemplateColumns: "32px 1fr auto", gap: "14px", alignItems: "center", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", marginBottom: "8px", textDecoration: "none" }}
            >
              <div style={{ width: "32px", height: "32px", display: "grid", placeItems: "center", borderRadius: "6px", flexShrink: 0, background: ch.color.bg, color: ch.color.fg }}>
                {ch.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "11px", color: T.txtQuaternary, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontMono, marginBottom: "2px" }}>{ch.label}</div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: T.txtPrimary, letterSpacing: "-0.011em", marginBottom: "4px" }}>{ch.name}</div>
                <div style={{ fontSize: "13px", color: T.txtTertiary, letterSpacing: "-0.006em", lineHeight: 1.4 }}>{ch.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.txtSecondary, letterSpacing: "-0.006em", whiteSpace: "nowrap" }}>{ch.email}</span>
                <svg className="ch-arrow" style={{ width: "14px", height: "14px", color: T.txtQuaternary, transition: "transform 0.2s, color 0.2s", flexShrink: 0 }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7h8M8 4l3 3-3 3"/>
                </svg>
              </div>
            </a>
          ))}


          {/* Offices */}
          <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {[
              { city: "Cairo · HQ", flag: "EG", addr: "5 Sherif Pasha St.\nDowntown Cairo, 11511" },
            ].map((o) => (
              <div key={o.flag} style={{ border: `1px solid ${T.border}`, background: T.bgEl, borderRadius: "8px", padding: "14px 16px" }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: T.txtPrimary, letterSpacing: "-0.011em", display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  {o.city}
                  <span style={{ fontFamily: T.fontMono, fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "var(--muted)", color: T.txtTertiary, letterSpacing: "0.04em" }}>{o.flag}</span>
                </div>
                <div style={{ fontSize: "12px", color: T.txtTertiary, lineHeight: 1.5, letterSpacing: "-0.006em", whiteSpace: "pre-line" }}>{o.addr}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: form card */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: "12px", background: T.bgEl, padding: "32px 36px", position: "relative", overflow: "hidden" }}>
          {/* Decorative glow */}
          <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(223,255,0,0.12), transparent 60%)", filter: "blur(40px)", pointerEvents: "none" }} aria-hidden="true" />

          <h3 style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "-0.022em", color: T.txtPrimary, marginBottom: "4px", position: "relative" }}>Or send a note.</h3>
          <p style={{ fontSize: "14px", color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "24px", position: "relative" }}>
            We read every message and reply within one business day.
          </p>

          {/* Reason chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {REASONS.map(({ id, label }) => {
              const active = reason === id;
              return (
                <button
                  key={id}
                  type="button"
                  className="reason-chip"
                  onClick={() => setReason(id)}
                   style={{ padding: "6px 12px", border: `1px solid ${active ? "var(--brand-border)" : T.border}`, borderRadius: "6px", background: active ? "var(--brand-soft)" : "var(--background)", fontSize: "12px", color: active ? T.txtPrimary : T.txtSecondary, cursor: "pointer", letterSpacing: "-0.006em", fontFamily: T.fontSans }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Row 1: name + email */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="contact-name" style={{ display: "block", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "6px" }}>
                  Full name <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError("name"); }}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "contact-name-error" : undefined}
                  className="field-input"
                  style={{ ...inputStyle, ...errorBorder("name") }}
                />
                {fieldError("name")}
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="contact-email" style={{ display: "block", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "6px" }}>
                  Work email <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "contact-email-error" : undefined}
                  className="field-input"
                  style={{ ...inputStyle, ...errorBorder("email") }}
                />
                {fieldError("email")}
              </div>
            </div>

            {/* Row 2: company + team size */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "6px" }}>Company</label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="field-input"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "6px" }}>Team size</label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="field-input"
                  style={{ ...inputStyle, cursor: "pointer", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%238a8f98' stroke-width='1.5'><path d='M3 4.5l3 3 3-3'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px" }}
                >
                  {TEAM_SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="contact-message" style={{ display: "block", fontSize: "12px", fontWeight: 500, color: T.txtTertiary, letterSpacing: "-0.006em", marginBottom: "6px" }}>
                What can we help with? <span style={{ color: "#f87171" }}>*</span>
              </label>
              <textarea
                id="contact-message"
                required
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "contact-message-error" : undefined}
                placeholder="We're evaluating VesperWise vs 6sense. Looking for a 20‑min walkthrough of Autopilot routing logic…"
                value={message}
                onChange={(e) => { setMessage(e.target.value); clearError("message"); }}
                className="field-input"
                style={{ ...inputStyle, height: "120px", padding: "12px 14px", resize: "vertical", lineHeight: 1.55, ...errorBorder("message") }}
              />
              {fieldError("message") ?? (
                <div style={{ fontSize: "11px", color: T.txtQuaternary, marginTop: "6px", fontFamily: T.fontMono, letterSpacing: "0.02em" }}>We read every line</div>
              )}
            </div>

            {/* Submit row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px", padding: "0 18px", borderRadius: "6px", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", cursor: status === "loading" || status === "success" ? "default" : "pointer", border: "none", fontFamily: T.fontSans, transition: "opacity 0.15s", background: status === "success" ? "rgba(255,255,255,0.07)" : T.accent, color: status === "success" ? T.txtSecondary : "#000000", boxShadow: status === "success" ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)", opacity: status === "loading" ? 0.7 : 1 }}
              >
                {status === "success" ? "Sent ✓" : status === "loading" ? "Sending…" : (
                  <>
                    Send to sales
                    <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
                  </>
                )}
              </button>
              <p style={{ fontSize: "11px", color: T.txtQuaternary, lineHeight: 1.5, letterSpacing: "-0.006em", margin: 0 }}>
                By submitting, you agree to our{" "}
                <Link href="/terms" style={{ color: T.txtTertiary, textDecoration: "underline", textDecorationColor: T.borderStrong, textUnderlineOffset: "2px" }}>Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" style={{ color: T.txtTertiary, textDecoration: "underline", textDecorationColor: T.borderStrong, textUnderlineOffset: "2px" }}>Privacy Policy</Link>
                . We won&rsquo;t add you to a drip campaign.
              </p>
            </div>
            {status === "error" && (
              <p role="alert" style={{ marginTop: "10px", fontSize: "13px", color: "#f87171" }}>
                {serverError} Or email us directly at{" "}
                <a href="mailto:sales@vesperwise.com" style={{ textDecoration: "underline" }}>sales@vesperwise.com</a>.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* ── FAQ strip ── */}
       <section style={{ borderTop: `1px solid ${T.border}`, background: T.bgEl, padding: "64px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "48px" }}>
            <div>
              <div style={{ fontSize: "12px", color: T.txtTertiary, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Before you send</div>
              <h3 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.022em", color: T.txtPrimary, marginTop: "12px", marginBottom: "8px" }}>
                The five questions we get most.
              </h3>
              <p style={{ fontSize: "14px", color: T.txtTertiary, lineHeight: 1.55, letterSpacing: "-0.006em", maxWidth: "280px" }}>
                If your question is here, you&rsquo;ll have an answer in 30 seconds.
              </p>
            </div>
            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
