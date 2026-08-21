"use client";

import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";
import { PLAN_CREDITS, PLAN_WATCHLIST_LIMIT, PLAN_AUTOPILOT_LIMIT } from "@/lib/types";

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

const NAV_LINKS = [
  { label: "Product",    href: "/#product"   },
  { label: "Autopilot",  href: "/#autopilot" },
  { label: "Developers", href: "/docs"       },
  { label: "Pricing",    href: "/pricing"    },
];

export default function PricingView() {
  return (
    <div style={{ background: T.bg, color: T.txtPrimary, fontFamily: T.fontSans, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" } as React.CSSProperties}>
      <style>{`
        .price-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .price-card:hover { border-color: rgba(255,255,255,0.13); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .price-card.featured { border-color: rgba(223,255,0,0.3); background: linear-gradient(180deg, rgba(223,255,0,0.03), var(--surface)); }
        .price-card.featured:hover { border-color: rgba(223,255,0,0.4); box-shadow: 0 4px 16px rgba(223,255,0,0.12); }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 100, height: "36px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: T.txtSecondary, background: "rgba(8,9,10,0.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}`, letterSpacing: "-0.011em" } as React.CSSProperties}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginRight: "10px", fontSize: "11px", fontWeight: 600, color: T.cyan, background: T.cyanSoft, padding: "1px 8px", borderRadius: "999px" }}>NEW</span>
        <span><strong style={{ color: T.txtPrimary, fontWeight: 500 }}>Autopilot</strong> — workflows that fire when intent crosses your threshold</span>
        <a href="/#autopilot" style={{ marginLeft: "8px", color: T.txtSecondary }}>→</a>
      </div>

      <nav style={{ position: "sticky", top: "36px", zIndex: 50, background: "rgba(8,9,10,0.72)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: `1px solid ${T.border}` } as React.CSSProperties}>
        <div style={{ display: "flex", alignItems: "center", height: "56px", padding: "0 24px", maxWidth: "1320px", margin: "0 auto", gap: "28px" }}>
          <Link href="/" aria-label="VesperWise home" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 600, letterSpacing: "-0.022em", fontSize: "15px", color: T.txtPrimary, textDecoration: "none" }}>
            <VesperWiseLogo size={42} variant="wordmark" />
          </Link>
          <div className="mkt-navlinks" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} style={{ display: "inline-flex", alignItems: "center", fontSize: "14px", color: label === "Pricing" ? T.txtPrimary : T.txtSecondary, padding: "6px 10px", borderRadius: "6px", letterSpacing: "-0.011em", textDecoration: "none", background: label === "Pricing" ? "rgba(255,255,255,0.04)" : "transparent" }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/login" style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtSecondary, padding: "6px 10px", borderRadius: "6px", textDecoration: "none" }}>Sign in</Link>
          <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtPrimary, padding: "0 14px", height: "32px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>Start free</Link>
          <Link href="/contact#contact-form" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: "#000000", padding: "0 14px", height: "32px", borderRadius: "6px", background: T.accent, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)", textDecoration: "none" }}>
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
        <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500, color: T.txtSecondary, letterSpacing: "-0.011em", marginBottom: "22px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: T.cyan, boxShadow: "0 0 8px #dfff00", display: "block" }} />
            Pricing
          </div>
          <h1 style={{ fontWeight: 500, letterSpacing: "-0.042em", lineHeight: 1, fontSize: "clamp(40px, 6.4vw, 76px)", marginBottom: "22px", color: T.txtPrimary }}>
            Start free.<br />Pay when you close.
          </h1>
          <p style={{ maxWidth: "620px", color: T.txtSecondary, fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.55, letterSpacing: "-0.011em", margin: "0 auto" }}>
            One credit = one account scored. Bulk and re‑scores included. Cancel anytime — no annual contracts, no setup calls.
          </p>
        </div>
      </section>

      <section style={{ padding: "80px 24px", maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", maxWidth: "1100px", margin: "0 auto" }}>

          <div className="price-card" style={{ border: `1px solid ${T.border}`, borderRadius: "8px", padding: "28px 24px", background: T.surface, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, color: T.txtPrimary, marginBottom: "8px", letterSpacing: "-0.011em" }}>Free</div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "40px", fontWeight: 600, color: T.txtPrimary, letterSpacing: "-0.032em" }}>$0</span>
              <span style={{ fontSize: "15px", color: T.txtTertiary }}> / mo</span>
            </div>
            <div style={{ fontSize: "14px", color: T.txtSecondary, marginBottom: "20px", letterSpacing: "-0.006em" }}>
              <strong style={{ color: T.txtPrimary }}>{PLAN_CREDITS.free}</strong> account scores
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {[
                "Dashboard access",
                `${PLAN_WATCHLIST_LIMIT.free} watchlist accounts`,
                "AI summary on every score",
              ].map((feat) => (
                <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: T.txtSecondary, lineHeight: 1.5 }}>
                  <svg style={{ width: "14px", height: "14px", flexShrink: 0, color: T.cyan, marginTop: "2px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  {feat}
                </div>
              ))}
            </div>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtPrimary, padding: "0 16px", height: "36px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
              Start free
            </Link>
          </div>

          <div className="price-card" style={{ border: `1px solid ${T.border}`, borderRadius: "8px", padding: "28px 24px", background: T.surface, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, color: T.txtPrimary, marginBottom: "8px", letterSpacing: "-0.011em" }}>Starter</div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "40px", fontWeight: 600, color: T.txtPrimary, letterSpacing: "-0.032em" }}>$29</span>
              <span style={{ fontSize: "15px", color: T.txtTertiary }}> / mo</span>
            </div>
            <div style={{ fontSize: "14px", color: T.txtSecondary, marginBottom: "20px", letterSpacing: "-0.006em" }}>
              <strong style={{ color: T.txtPrimary }}>{PLAN_CREDITS.starter}</strong> account scores · <span style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.txtTertiary }}>$0.058 each</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {[
                "Everything in Free",
                `${PLAN_WATCHLIST_LIMIT.starter} watchlist accounts`,
                "API + CSV exports",
                `${PLAN_AUTOPILOT_LIMIT.starter} Autopilot workflow${PLAN_AUTOPILOT_LIMIT.starter === 1 ? '' : 's'}`,
              ].map((feat) => (
                <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: T.txtSecondary, lineHeight: 1.5 }}>
                  <svg style={{ width: "14px", height: "14px", flexShrink: 0, color: T.cyan, marginTop: "2px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  {feat}
                </div>
              ))}
            </div>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtPrimary, padding: "0 16px", height: "36px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
              Get Starter
            </Link>
          </div>

          <div className="price-card featured" style={{ border: `1px solid rgba(223,255,0,0.3)`, borderRadius: "8px", padding: "28px 24px", background: "linear-gradient(180deg, rgba(223,255,0,0.03), var(--surface))", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ fontSize: "16px", fontWeight: 600, color: T.txtPrimary, letterSpacing: "-0.011em" }}>Growth</div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#000", background: T.accent, padding: "2px 8px", borderRadius: "999px", letterSpacing: "0.02em" }}>Most popular</span>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "40px", fontWeight: 600, color: T.txtPrimary, letterSpacing: "-0.032em" }}>$79</span>
              <span style={{ fontSize: "15px", color: T.txtTertiary }}> / mo</span>
            </div>
            <div style={{ fontSize: "14px", color: T.txtSecondary, marginBottom: "20px", letterSpacing: "-0.006em" }}>
              <strong style={{ color: T.txtPrimary }}>{PLAN_CREDITS.growth}</strong> account scores · <span style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.txtTertiary }}>$0.032 each</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {[
                "Everything in Starter",
                `${PLAN_WATCHLIST_LIMIT.growth} watchlist accounts`,
                `${PLAN_AUTOPILOT_LIMIT.growth} Autopilot workflows`,
                "Bulk scoring (1,000 / job)",
              ].map((feat) => (
                <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: T.txtSecondary, lineHeight: 1.5 }}>
                  <svg style={{ width: "14px", height: "14px", flexShrink: 0, color: T.cyan, marginTop: "2px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  {feat}
                </div>
              ))}
            </div>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: "#000000", padding: "0 16px", height: "36px", borderRadius: "6px", background: T.accent, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)", textDecoration: "none" }}>
              Get Growth
              <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
            </Link>
          </div>

          <div className="price-card" style={{ border: `1px solid ${T.border}`, borderRadius: "8px", padding: "28px 24px", background: T.surface, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, color: T.txtPrimary, marginBottom: "8px", letterSpacing: "-0.011em" }}>Pro</div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "40px", fontWeight: 600, color: T.txtPrimary, letterSpacing: "-0.032em" }}>$199</span>
              <span style={{ fontSize: "15px", color: T.txtTertiary }}> / mo</span>
            </div>
            <div style={{ fontSize: "14px", color: T.txtSecondary, marginBottom: "20px", letterSpacing: "-0.006em" }}>
              <strong style={{ color: T.txtPrimary }}>{PLAN_CREDITS.pro}</strong> account scores · <span style={{ fontFamily: T.fontMono, fontSize: "12px", color: T.txtTertiary }}>$0.025 each</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {[
                "Everything in Growth",
                `${PLAN_WATCHLIST_LIMIT.pro} watchlist accounts`,
                "People scoring",
                `${PLAN_AUTOPILOT_LIMIT.pro} Autopilot workflows`,
                "Priority support",
              ].map((feat) => (
                <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: T.txtSecondary, lineHeight: 1.5 }}>
                  <svg style={{ width: "14px", height: "14px", flexShrink: 0, color: T.cyan, marginTop: "2px" }} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  {feat}
                </div>
              ))}
            </div>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtPrimary, padding: "0 16px", height: "36px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
              Get Pro
            </Link>
          </div>

        </div>

        <p style={{ textAlign: "center", marginTop: "32px", fontSize: "12px", color: T.txtQuaternary, fontFamily: T.fontMono, letterSpacing: "0.04em" }}>
          Need 25,000+ scores? <Link href="/contact#contact-form" style={{ color: T.txtSecondary, textDecoration: "underline", textDecorationColor: T.borderStrong }}>Contact us for Agency pricing ($499/mo) →</Link>
        </p>

        <div style={{ marginTop: "64px", padding: "32px", border: `1px solid ${T.border}`, borderRadius: "8px", background: T.bgEl, maxWidth: "780px", margin: "64px auto 0" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: T.txtPrimary, marginBottom: "16px", letterSpacing: "-0.011em" }}>Frequently asked questions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: T.txtPrimary, marginBottom: "6px" }}>What is a "credit"?</div>
              <div style={{ fontSize: "13px", color: T.txtSecondary, lineHeight: 1.6 }}>One credit = one company scored. Scores are cached for 6 hours, so re-requests within that window cost 0 credits. Bulk jobs deduct credits upfront (one per company).</div>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: T.txtPrimary, marginBottom: "6px" }}>What happens when I run out of credits?</div>
              <div style={{ fontSize: "13px", color: T.txtSecondary, lineHeight: 1.6 }}>API calls return a 402 status. Your dashboard still works (you can view existing scores), but you cannot score new companies until you upgrade or buy a top-up.</div>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: T.txtPrimary, marginBottom: "6px" }}>Can I cancel anytime?</div>
              <div style={{ fontSize: "13px", color: T.txtSecondary, lineHeight: 1.6 }}>Yes. All plans are month-to-month. Cancel from Settings → Billing. You keep access until the end of your billing period, and unused credits expire at the end of the month.</div>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: T.txtPrimary, marginBottom: "6px" }}>Do you offer annual plans or discounts?</div>
              <div style={{ fontSize: "13px", color: T.txtSecondary, lineHeight: 1.6 }}>Not yet. We prioritize fast iteration and month-to-month flexibility over long-term lock-in. Agency customers can discuss volume discounts via the contact form.</div>
            </div>
          </div>
        </div>

      </section>

      <section style={{ padding: "80px 24px", background: T.bgEl, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px, 4.8vw, 48px)", fontWeight: 500, letterSpacing: "-0.032em", lineHeight: 1.1, color: T.txtPrimary, marginBottom: "20px" }}>
            <span style={{ background: "linear-gradient(135deg, #4ade80, #dfff00, #e8ff40)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Set the pace<br />of your pipeline.</span>
          </h2>
          <p style={{ fontSize: "16px", color: T.txtSecondary, lineHeight: 1.6, marginBottom: "32px" }}>
            Every day you wait, a competitor scores your best prospects and books the meeting first.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.006em", color: "#000000", padding: "0 20px", height: "44px", borderRadius: "6px", background: T.accent, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.3)", textDecoration: "none" }}>
              Start scoring free
              <svg style={{ width: "12px", height: "12px" }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
            </Link>
            <Link href="/contact#contact-form" style={{ display: "inline-flex", alignItems: "center", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.006em", color: T.txtPrimary, padding: "0 20px", height: "44px", borderRadius: "6px", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
              Contact us
            </Link>
          </div>
          <p style={{ marginTop: "24px", fontSize: "12px", color: T.txtQuaternary, fontFamily: T.fontMono, letterSpacing: "0.04em" }}>
            20 FREE CREDITS · NO CARD · COVERAGE-AWARE SCORES
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
