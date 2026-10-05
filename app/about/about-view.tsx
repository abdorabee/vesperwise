import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";
import { PLAN_CREDITS } from "@/lib/types";

/* ─── Page data ──────────────────────────────────────────────── */
const STEPS = [
  { title: "Collect dated signals", desc: "Funding, hiring, news and tech-stack changes for the company, each with a date and a source. Website and GitHub activity add context." },
  { title: "Score what the evidence supports", desc: "Signals are weighted and older ones count for less. When coverage is too thin, the API returns no score rather than a guess." },
  { title: "Explain it in a sentence", desc: "Each score comes with why the account matters now and a suggested next step a rep can act on." },
  { title: "Act while the window is open", desc: "HOT accounts rise to the top of the pipeline and the watchlist flags new ones. One click drafts a first email from the evidence." },
];

const PRINCIPLES = [
  { title: "Reasoning ships with the number", desc: "A score without an explanation is a dashboard tile, and dashboard tiles get ignored. Every score shows the evidence behind it." },
  { title: "Honest coverage", desc: "Missing data lowers coverage instead of quietly becoming zero intent. A thin score never passes for a strong one." },
  { title: "Built for the rep", desc: "Managers buy the tool; reps decide whether it gets used. Every feature has to help someone decide who to call today." },
  { title: "A human stays in the loop", desc: "VesperWise drafts the first email. A rep reads it and decides whether to send it." },
];

const LINKS = [
  { href: "mailto:support@vesperwise.com", label: "support@vesperwise.com" },
  { href: "https://www.linkedin.com/in/abdel-rahman-rabee-3543011b6/", label: "LinkedIn" },
  { href: "https://github.com/abdorabee", label: "GitHub" },
];

/* ─── Main view ──────────────────────────────────────────────── */
export default function AboutView() {
  return (
    <div className="about-page">
      <style>{`
        .about-page { background: var(--background); color: var(--foreground); min-height: 100vh; }
        .about-wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
        .about-hero { padding: 88px 0 64px; border-bottom: 1px solid var(--border); }
        .about-hero h1 { font-size: clamp(40px, 5.5vw, 64px); font-weight: 500; letter-spacing: -0.035em; line-height: 1.05; margin: 0 0 20px; max-width: 820px; text-wrap: balance; }
        .about-hero p { font-size: 18px; line-height: 1.6; color: var(--text-secondary); max-width: 620px; margin: 0; text-wrap: pretty; }
        .about-section { padding: 72px 0 0; }
        .about-section h2 { font-size: clamp(26px, 3vw, 36px); font-weight: 500; letter-spacing: -0.028em; line-height: 1.15; margin: 0 0 8px; }
        .about-section .sub { font-size: 15px; color: var(--muted-foreground); margin: 0 0 32px; max-width: 600px; }
        .about-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; counter-reset: step; }
        .about-steps li { background: var(--background); padding: 24px; counter-increment: step; }
        .about-steps li::before { content: counter(step); display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: var(--brand); color: var(--on-brand, #000); font-size: 12px; font-weight: 600; margin-bottom: 14px; font-variant-numeric: tabular-nums; }
        .about-steps h3, .about-principles h3 { font-size: 17px; font-weight: 500; letter-spacing: -0.015em; margin: 0 0 6px; }
        .about-steps p, .about-principles p { font-size: 14px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
        .about-principles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px 40px; }
        .about-founder { display: grid; grid-template-columns: 96px 1fr; gap: 24px; align-items: start; border: 1px solid var(--border); border-radius: 16px; background: var(--card); padding: 28px; }
        .about-avatar { width: 96px; height: 96px; border-radius: 20px; display: grid; place-items: center; background: var(--muted); color: var(--foreground); font-size: 32px; font-weight: 600; letter-spacing: -0.04em; }
        .about-founder h3 { font-size: 22px; font-weight: 500; letter-spacing: -0.02em; margin: 0 0 2px; }
        .about-founder .role { font-size: 13px; color: var(--muted-foreground); margin: 0 0 14px; }
        .about-founder p { font-size: 15px; line-height: 1.65; color: var(--text-secondary); margin: 0 0 16px; max-width: 620px; }
        .about-links { display: flex; flex-wrap: wrap; gap: 8px; }
        .about-links a { display: inline-flex; align-items: center; min-height: 32px; padding: 0 12px; font-size: 13px; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; transition: color 150ms ease, border-color 150ms ease; }
        .about-links a:hover { color: var(--foreground); border-color: var(--border-strong); }
        .about-cta { margin-top: 88px; padding: 72px 16px; text-align: center; border-top: 1px solid var(--border); background: var(--card); }
        .about-cta h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 500; letter-spacing: -0.03em; margin: 0 0 12px; }
        .about-cta p { font-size: 16px; color: var(--text-secondary); margin: 0 0 28px; }
        .about-cta .row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .about-btn { display: inline-flex; align-items: center; height: 44px; padding: 0 20px; border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none; border: 1px solid var(--border); color: var(--foreground); transition: background-color 150ms ease, transform 160ms ease-out; }
        .about-btn:active { transform: scale(0.97); }
        .about-btn.primary { background: var(--brand); color: var(--on-brand, #000); border-color: transparent; }
        .about-btn.primary:hover { background: var(--brand-hover); }
        @media (max-width: 640px) { .about-hero h1 { font-size: 32px; } }
        @media (max-width: 560px) { .about-founder { grid-template-columns: 1fr; } }
      `}</style>

      <LandingNav />
      <main id="main">

      <section className="about-hero">
        <div className="about-wrap">
          <h1>Sales teams should know which accounts to call, and why.</h1>
          <p>
            VesperWise turns public buying signals into one score per company, with the evidence and a next step attached.
            It is built in Cairo for B2B sales teams that would rather talk to buyers than read dashboards.
          </p>
        </div>
      </section>

      <section className="about-section">
        <div className="about-wrap">
          <h2>How a score comes together</h2>
          <p className="sub">The same four steps run for every company you score, from the dashboard or the API.</p>
          <ol className="about-steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="about-section">
        <div className="about-wrap">
          <h2>What we hold ourselves to</h2>
          <p className="sub">These decide what gets built and what doesn&apos;t.</p>
          <div className="about-principles">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-wrap">
          <h2>Who&apos;s behind it</h2>
          <p className="sub">You can reach the founder directly.</p>
          <div className="about-founder">
            <div className="about-avatar" aria-hidden="true">AR</div>
            <div>
              <h3>Abdel‑Rahaman Rabee</h3>
              <div className="role">Founder</div>
              <p>
                Abdel‑Rahaman started VesperWise after watching sales teams pay for intent data their reps had stopped reading.
                He leads the product, the scoring model and customer conversations, and reads every support email.
              </p>
              <div className="about-links">
                {LINKS.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <h2>See it on your own accounts.</h2>
        <p>{PLAN_CREDITS.free} free scores, no credit card.</p>
        <div className="row">
          <Link href="/signup" className="about-btn primary">Start scoring free</Link>
          <Link href="/contact#contact-form" className="about-btn">Book a demo</Link>
        </div>
      </section>

      </main>
      <SiteFooter />
    </div>
  );
}
