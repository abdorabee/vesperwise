import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import StickyMobileCta from "@/components/landing/sticky-mobile-cta";
import SiteFooter from "@/components/site-footer";
import {
  BULK_MAX_CONCURRENT,
  BULK_MAX_PER_JOB,
  MARKETING_PLANS,
  MARKETING_TOPUPS,
  formatCount,
  planCreditsFeature,
} from "@/lib/plan-features";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a credit?",
    a: "One credit scores one company. Results are cached for 6 hours, so asking for the same company again inside that window costs nothing. Bulk API jobs (early access) reserve one credit per company when the job is created.",
  },
  {
    q: "What happens when I run out?",
    a: "New scoring requests return HTTP 402. Your existing scores, watchlist and history stay available. Buy a top-up pack or move to a larger plan to keep scoring.",
  },
  {
    q: "How do top-up packs work?",
    a: "Top-ups are one-time purchases that add credits to your current balance without changing your plan. You buy them from Billing once you are signed in.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are month-to-month and you can cancel from Billing. You keep access until the end of the billing period. Monthly plan credits reset when the plan renews or changes.",
  },
  {
    q: "Do you offer annual plans?",
    a: "Not yet. Every plan is billed monthly with no contract.",
  },
];

export default function PricingView() {
  return (
    <div className="pricing-page">
      <style>{`
        .pricing-page { background: var(--background); color: var(--foreground); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
        .pp-hero { padding: 88px 16px 56px; text-align: center; border-bottom: 1px solid var(--border); }
        .pp-hero h1 { font-weight: 500; letter-spacing: -0.042em; line-height: 1; font-size: clamp(40px, 6.4vw, 72px); margin: 0 0 20px; text-wrap: balance; }
        .pp-hero p { max-width: 600px; margin: 0 auto; color: var(--text-secondary); font-size: clamp(16px, 1.25vw, 18px); line-height: 1.55; text-wrap: pretty; }
        .pp-wrap { max-width: 1320px; margin: 0 auto; padding: 64px 16px 80px; }
        .pp-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 720px) { .pp-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1180px) { .pp-grid { grid-template-columns: repeat(5, 1fr); } }
        .pp-card { border: 1px solid var(--border); border-radius: 12px; padding: 24px 20px; background: var(--card); display: flex; flex-direction: column; }
        .pp-card.featured { border-color: var(--brand-border); box-shadow: 0 0 0 1px var(--brand-border); }
        .pp-name { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.011em; margin-bottom: 4px; }
        .pp-pill { font-size: 11px; font-weight: 600; color: var(--on-brand, #000); background: var(--brand); padding: 2px 8px; border-radius: 999px; }
        .pp-blurb { font-size: 13px; color: var(--muted-foreground); line-height: 1.45; min-height: 38px; margin-bottom: 16px; }
        .pp-amt { margin-bottom: 4px; font-variant-numeric: tabular-nums; }
        .pp-amt .num { font-size: 40px; font-weight: 600; letter-spacing: -0.032em; }
        .pp-amt .per { font-size: 15px; color: var(--muted-foreground); }
        .pp-unit { font-size: 13px; color: var(--muted-foreground); margin-bottom: 20px; font-variant-numeric: tabular-nums; min-height: 20px; }
        .pp-feats { list-style: none; padding: 0; margin: 0 0 24px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .pp-feats li { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        .pp-feats svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 3px; color: var(--foreground); opacity: 0.7; }
        .pp-btn { display: inline-flex; align-items: center; justify-content: center; height: 40px; padding: 0 16px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; border: 1px solid var(--border); color: var(--foreground); background: transparent; transition: background-color 150ms ease, transform 160ms ease-out; }
        .pp-btn:hover { background: var(--surface-wash, rgba(127,127,127,0.08)); }
        .pp-btn:active { transform: scale(0.97); }
        .pp-btn.primary { background: var(--brand); border-color: transparent; color: var(--on-brand, #000); }
        .pp-btn.primary:hover { background: var(--brand-hover); }
        .pp-note { text-align: center; margin: 20px auto 0; max-width: 640px; font-size: 13px; color: var(--muted-foreground); line-height: 1.55; }
        .pp-section-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 6px; }
        .pp-section-sub { font-size: 14px; color: var(--muted-foreground); margin: 0 0 20px; }
        .pp-topups { margin-top: 72px; }
        .pp-topup-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 720px) { .pp-topup-grid { grid-template-columns: repeat(3, 1fr); } }
        .pp-topup { border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; background: var(--card); display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-variant-numeric: tabular-nums; }
        .pp-topup strong { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
        .pp-topup .price { font-size: 18px; font-weight: 600; }
        .pp-topup .rate { display: block; font-size: 12px; color: var(--muted-foreground); margin-top: 2px; }
        .pp-faq { margin: 72px auto 0; max-width: 780px; }
        .pp-faq dl { margin: 0; border-top: 1px solid var(--border); }
        .pp-faq dt { font-size: 15px; font-weight: 500; padding-top: 18px; }
        .pp-faq dd { margin: 6px 0 0; padding-bottom: 18px; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
        .pp-cta { padding: 72px 16px; text-align: center; border-top: 1px solid var(--border); background: var(--card); }
        .pp-cta h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 500; letter-spacing: -0.03em; margin: 0 0 12px; }
        .pp-cta p { color: var(--text-secondary); margin: 0 0 24px; }
        .pp-cta .row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        @media (max-width: 640px) { .pp-hero h1 { font-size: 32px; } }
      `}</style>

      <LandingNav />
      <main id="main">

      <section className="pp-hero">
        <h1>Start free. Pay for the accounts you score.</h1>
        <p>
          One credit scores one company. Every plan includes the full score, the evidence behind it and a suggested next step.
          Month-to-month, cancel anytime.
        </p>
      </section>

      <div className="pp-wrap">
        <div className="pp-grid">
          {MARKETING_PLANS.map((plan) => (
            <div key={plan.key} className={`pp-card${plan.featured ? " featured" : ""}`}>
              <div className="pp-name">
                {plan.label}
                {plan.featured ? <span className="pp-pill">Most popular</span> : null}
              </div>
              <div className="pp-blurb">{plan.blurb}</div>
              <div className="pp-amt">
                <span className="num">${formatCount(plan.price)}</span>
                <span className="per"> / mo</span>
              </div>
              <div className="pp-unit">{plan.perScore ?? "No card required"}</div>
              <ul className="pp-feats">
                {[planCreditsFeature(plan.key), ...plan.features].map((feat) => (
                  <li key={feat}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 7l3 3 5-7" /></svg>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`pp-btn${plan.featured ? " primary" : ""}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="pp-note">
          Bulk API jobs are in early access: they take up to {formatCount(BULK_MAX_PER_JOB)} companies each, with {BULK_MAX_CONCURRENT} jobs running at once on any plan. For lists of up to 50 companies today, use CSV upload.
        </p>

        <section className="pp-topups" aria-labelledby="topups-title">
          <h2 id="topups-title" className="pp-section-title">Top-up packs</h2>
          <p className="pp-section-sub">One-time credits on top of any plan. They don&apos;t change your subscription.</p>
          <div className="pp-topup-grid">
            {MARKETING_TOPUPS.map((t) => (
              <div key={t.credits} className="pp-topup">
                <div>
                  <strong>{formatCount(t.credits)} credits</strong>
                  <span className="rate">{t.perCredit}</span>
                </div>
                <span className="price">${t.price}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pp-faq" aria-labelledby="faq-title">
          <h2 id="faq-title" className="pp-section-title" style={{ marginBottom: 16 }}>Questions</h2>
          <dl>
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="pp-cta">
        <h2>Score your first 20 accounts free.</h2>
        <p>No card required. Upgrade when the scores start booking meetings.</p>
        <div className="row">
          <Link href="/signup" className="pp-btn primary">Start scoring free</Link>
          <Link href="/contact#contact-form" className="pp-btn">Contact us</Link>
        </div>
      </section>

      </main>
      <SiteFooter />
      <StickyMobileCta />
    </div>
  );
}
