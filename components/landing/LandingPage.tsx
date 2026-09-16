import LandingNav from "@/components/landing/LandingNav";
import BloubMascot from "@/components/mascot/bloub-mascot";
import SiteFooter from "@/components/site-footer";
import VesperWiseLogo from "@/components/vesperwise-logo";

export default function LandingPage() {
  return (
    <>
      {/* Top banner */}
      <div className="top-banner">
        <a href="#autopilot" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span className="pill">NEW</span>
          <span><strong>Autopilot</strong> — workflows that fire when intent crosses your threshold</span>
          <span className="arrow" style={{ marginLeft: '8px' }}>→</span>
        </a>
      </div>

      {/* Nav (client component — manages mobile hamburger state) */}
      <LandingNav />

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="grid-overlay"></div>

        <div className="hero-inner">
          <div className="hero-mascot" aria-hidden="true">
            <BloubMascot size={200} color="#dfff00" paper="#08090a" follow playing />
          </div>
          <div className="hero-eyebrow">
            <span className="badge">Spring &apos;26</span>
            <span>People scoring + warm-account routing →</span>
          </div>
          <h1>
            <span className="grad">Pipeline intelligence</span><br />
            for B2B sales teams.
          </h1>
          <p className="lead">
            VesperWise scores every account in your pipeline on a 0–100 buying‑intent scale —
            live signals, AI reasoning, and the next move, in one place.
          </p>
          <div className="hero-actions">
            <a href="/signup" className="btn btn-accent btn-lg">
              Start scoring free
              <svg className="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
            </a>
            <a href="/contact#contact-form" className="btn btn-secondary btn-lg">
              Book a demo
            </a>
          </div>
          <div className="hero-meta">
            <strong>20 free credits</strong> · No credit card · Coverage-aware scoring
          </div>
        </div>

        {/* Mobile score preview — shown only on phones (≤980px), hidden on desktop */}
        <div className="hero-mob-preview">
          <div className="hmp-header">
            <span className="hmp-label">Live pipeline · 247 accounts</span>
            <span className="hmp-badge"><span className="hmp-dot"></span>HOT 12</span>
          </div>
          {[
            { av: "S", avClass: "av-s", name: "Stripe",    domain: "stripe.com",    score: 94, band: "HOT",  bandClass: "hot" },
            { av: "L", avClass: "av-l", name: "Linear",    domain: "linear.app",    score: 82, band: "HOT",  bandClass: "hot" },
            { av: "A", avClass: "av-a", name: "Anthropic", domain: "anthropic.com", score: 78, band: "WARM", bandClass: "warm" },
            { av: "V", avClass: "av-v", name: "Vercel",    domain: "vercel.com",    score: 67, band: "WARM", bandClass: "warm" },
            { av: "N", avClass: "av-n", name: "Notion",    domain: "notion.so",     score: 43, band: "COLD", bandClass: "cold" },
          ].map(({ av, avClass, name, domain, score, band, bandClass }) => (
            <div key={name} className="hmp-row">
              <div className={`hmp-av ${avClass}`}>{av}</div>
              <div className="hmp-info">
                <span className="hmp-name">{name}</span>
                <span className="hmp-domain">{domain}</span>
              </div>
              <div className="hmp-right">
                <span className={`hmp-band ${bandClass}`}>{band}</span>
                <span className="hmp-score">{score}</span>
              </div>
            </div>
          ))}
          <div className="hmp-footer">
            + 242 more accounts · updated just now
          </div>
        </div>

        {/* Hero product screen (desktop only — hidden ≤ 980px) */}
        <div className="hero-screen-wrap">
          <div className="hero-screen-glow"></div>
          <div className="app-screen">
            <div className="app">
              {/* Sidebar */}
              <aside className="app-sidebar">
                <div className="app-sb-head">
                  <VesperWiseLogo className="ws-logo" size={22} />
                  <div className="ws-name">Acme Sales</div>
                  <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4.5l3 3 3-3"/></svg>
                </div>

                <div className="sb-section">Workspace</div>
                <div className="sb-item active">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7l5-5 5 5M7 2v10"/></svg>
                  Intent Hub
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M7 4v3l2 2"/></svg>
                  Score
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 11l3-3 2 2 5-6"/></svg>
                  Pipeline
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="2.5"/><path d="M2 12c0-2 2-3.5 3-3.5s3 1.5 3 3.5M9 7l1.5 1.5L13 6"/></svg>
                  People
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h8v10H3z M5 5h4M5 7h4M5 9h2"/></svg>
                  Watchlist
                  <span className="count">24</span>
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7l5 5 5-5M2 3l5 5 5-5"/></svg>
                  Autopilot
                  <span className="count hot-count">●3</span>
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10v8H2z M2 4l5 4 5-4"/></svg>
                  Inbox
                  <span className="count">12</span>
                </div>

                <div className="sb-section" style={{ marginTop: '4px' }}>Settings</div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="2"/><path d="M7 1v2 M7 11v2 M1 7h2 M11 7h2"/></svg>
                  Settings
                </div>
                <div className="sb-item">
                  <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="10" height="6" rx="1"/><path d="M2 7h10"/></svg>
                  Billing
                </div>

                <div className="sb-spacer" />

                <div className="sb-credits">
                  <div className="label">Credits</div>
                  <div className="row">
                    <div><span className="val">1,548</span><span className="of"> / 2,500</span></div>
                    <a className="caption" style={{ color: 'var(--accent-2)', fontWeight: 500, fontSize: '12px', textDecoration: 'none' }}>Top up</a>
                  </div>
                  <div className="bar"><div className="fill"></div></div>
                </div>
              </aside>

              {/* Main */}
              <div className="app-main">
                <div className="app-toolbar">
                  <div className="crumb">
                    <span>Workspace</span><span className="sep">/</span>
                    <span className="current">Intent Hub</span>
                  </div>
                  <div className="toolbar-spacer"></div>
                  <button className="toolbar-btn">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><circle cx="5" cy="5" r="3"/><path d="M7 7l3 3"/></svg>
                    Search
                    <span className="kbd">⌘K</span>
                  </button>
                  <button className="toolbar-btn outlined">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M2 6h8M4 3h4M5 9h2"/></svg>
                    Filter
                  </button>
                  <button className="toolbar-btn outlined">
                    Today
                    <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"><path d="M3 4.5l3 3 3-3"/></svg>
                  </button>
                  <button className="btn btn-accent" style={{ height: '28px', fontSize: '13px', padding: '0 12px' }}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><path d="M6 2v8M2 6h8"/></svg>
                    Score account
                  </button>
                </div>

                <div className="filter-row">
                  <span className="filter-chip active">
                    All accounts
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" className="x"><path d="M3 3l6 6M9 3l-6 6"/></svg>
                  </span>
                  <span className="filter-chip">
                    <span className="band-hot" style={{ width: '5px', height: '5px', borderRadius: '999px', background: 'var(--hot)' }}></span>
                    Score ≥ 75
                  </span>
                  <span className="filter-chip">
                    Industry: SaaS
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" className="x"><path d="M3 3l6 6M9 3l-6 6"/></svg>
                  </span>
                  <span className="filter-chip">+ Add filter</span>
                  <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    247 results
                  </div>
                </div>

                <div className="app-content">
                  <div className="list-header">
                    <div>Account</div>
                    <div>Signal</div>
                    <div>Score</div>
                    <div>Signal mix</div>
                    <div>Owner</div>
                    <div style={{ textAlign: 'right' }}>Updated</div>
                  </div>

                  {/* Row 1 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-1">S</div>
                      <div>
                        <div className="co-name">Stripe</div>
                        <div className="co-domain">stripe.com</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label">
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="var(--cyan)" strokeWidth="1.6"><path d="M2 11V7m4 4V4m4 7V2"/></svg>
                        Series H · $6.5B
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num">94</span>
                      <div className="score-bar"><div className="fill" style={{ width: '94%', background: 'var(--hot)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '96%' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '88%' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '92%' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '78%' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '84%' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span className="assignee av-3">DM</span> D. Marwan
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">3m</span>
                      <span className="delta delta-up" style={{ marginLeft: '6px' }}>▲ 12</span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-4">L</div>
                      <div>
                        <div className="co-name">Linear</div>
                        <div className="co-domain">linear.app</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label">
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="var(--hot)" strokeWidth="1.6"><path d="M3 13c0-3 1.5-5 4-5s4 2 4 5M7 7a3 3 0 100-6 3 3 0 000 6z"/></svg>
                        +18 Eng. hires this quarter
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num">82</span>
                      <div className="score-bar"><div className="fill" style={{ width: '82%', background: 'var(--hot)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '62%' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '91%' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '74%' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '88%' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '81%' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span className="assignee av-1">JS</span> J. Sato
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">9m</span>
                      <span className="delta delta-up" style={{ marginLeft: '6px' }}>▲ 4</span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-2">A</div>
                      <div>
                        <div className="co-name">Anthropic</div>
                        <div className="co-domain">anthropic.com</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label">
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="var(--warm)" strokeWidth="1.6"><path d="M7 1l1.5 4.5L13 7l-4.5 1.5L7 13l-1.5-4.5L1 7l4.5-1.5z"/></svg>
                        TechCrunch coverage
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num">96</span>
                      <div className="score-bar"><div className="fill" style={{ width: '96%', background: 'var(--hot)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '98%' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '95%' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '99%' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '90%' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '94%' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span className="assignee av-6">AC</span> A. Chen
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">14m</span>
                      <span className="delta delta-up" style={{ marginLeft: '6px' }}>▲ 7</span>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-7">V</div>
                      <div>
                        <div className="co-name">Vercel</div>
                        <div className="co-domain">vercel.com</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label">
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="var(--accent-2)" strokeWidth="1.6"><rect x="1" y="2" width="12" height="10" rx="1"/><path d="M4 6h6M4 9h4"/></svg>
                        Detected: Segment, Snowflake
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num">67</span>
                      <div className="score-bar"><div className="fill" style={{ width: '67%', background: 'var(--warm)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '55%' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '48%' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '62%' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '88%' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '71%' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span className="assignee av-3">DM</span> D. Marwan
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">1h</span>
                      <span className="delta delta-up" style={{ marginLeft: '6px' }}>▲ 2</span>
                    </div>
                  </div>

                  {/* Row 5 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-3">N</div>
                      <div>
                        <div className="co-name">Notion</div>
                        <div className="co-domain">notion.so</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label">
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="#8a8f98" strokeWidth="1.6"><path d="M2 7l3 3 7-7"/></svg>
                        Pricing-page traffic spike
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num">78</span>
                      <div className="score-bar"><div className="fill" style={{ width: '78%', background: 'var(--hot)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '42%' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '67%' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '71%' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '74%' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '96%' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span className="assignee av-5">RB</span> R. Becker
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">2h</span>
                      <span className="delta delta-flat" style={{ marginLeft: '6px' }}>— 0</span>
                    </div>
                  </div>

                  {/* Row 6 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-8">F</div>
                      <div>
                        <div className="co-name">Figma</div>
                        <div className="co-domain">figma.com</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label">
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="var(--warm)" strokeWidth="1.6"><path d="M7 1l1.5 4.5L13 7l-4.5 1.5L7 13l-1.5-4.5L1 7l4.5-1.5z"/></svg>
                        Config &apos;26 keynote
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num">71</span>
                      <div className="score-bar"><div className="fill" style={{ width: '71%', background: 'var(--warm)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '38%' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '62%' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '88%' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '69%' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '78%' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span className="assignee av-1">JS</span> J. Sato
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">3h</span>
                      <span className="delta delta-up" style={{ marginLeft: '6px' }}>▲ 5</span>
                    </div>
                  </div>

                  {/* Row 7 */}
                  <div className="list-row">
                    <div className="co">
                      <div className="co-avatar av-5">M</div>
                      <div>
                        <div className="co-name">Mixpanel</div>
                        <div className="co-domain">mixpanel.com</div>
                      </div>
                    </div>
                    <div>
                      <span className="signal-label" style={{ color: 'var(--text-tertiary)' }}>
                        <svg className="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="5"/></svg>
                        No new signals
                      </span>
                    </div>
                    <div className="score-cell">
                      <span className="score-num" style={{ color: 'var(--text-tertiary)' }}>38</span>
                      <div className="score-bar"><div className="fill" style={{ width: '38%', background: 'var(--cold)' }}></div></div>
                    </div>
                    <div className="signals-cell">
                      <div className="sig-bar sig-funding"><div className="fill" style={{ height: '21%', background: 'rgba(255,255,255,0.15)' }}></div></div>
                      <div className="sig-bar sig-hiring"><div className="fill" style={{ height: '32%', background: 'rgba(255,255,255,0.15)' }}></div></div>
                      <div className="sig-bar sig-news"><div className="fill" style={{ height: '28%', background: 'rgba(255,255,255,0.15)' }}></div></div>
                      <div className="sig-bar sig-tech"><div className="fill" style={{ height: '54%', background: 'rgba(255,255,255,0.15)' }}></div></div>
                      <div className="sig-bar sig-web"><div className="fill" style={{ height: '42%', background: 'rgba(255,255,255,0.15)' }}></div></div>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <span className="assignee av-2">—</span> Unassigned
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="caption mono">1d</span>
                      <span className="delta delta-down" style={{ marginLeft: '6px' }}>▼ 3</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="trust">
        <div className="trust-label">Solo-built · v0.1 · Priced for SMB sales teams</div>
      </section>

      {/* Pillars */}
      <section className="section" id="product">
        <div className="container">
          <div className="section-head center">
            <div className="label"><span className="accent"></span>Made for sales teams who close</div>
            <h2 className="h1">Stop guessing.<br /><span className="muted">Start scoring.</span></h2>
            <p>Four dated purchase triggers — funding, hiring, news, and technology change — fused into one coverage-aware score, with web and GitHub shown as context.</p>
          </div>
        </div>

        <div className="pillars">
          <div className="pillar">
            <div className="pillar-num">01 — Signal</div>
            <h3>Four explainable triggers, in parallel.</h3>
            <p>Funding, hiring velocity, non-funding news, and dated tech‑stack changes. Each contribution is normalized, freshness-decayed, and coverage-adjusted.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">02 — Reason</div>
            <h3>An AI summary you&apos;d actually paste to your boss.</h3>
            <p>A bounded AI pass writes a two‑line buying thesis, the most relevant talk track, and a recommended next action, with a deterministic fallback.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">03 — Act</div>
            <h3>Workflows that fire while the window&apos;s open.</h3>
            <p>Cross 75 and an account routes to the closer who owns the segment. Drop below 50 and it pauses sequences. No more dashboards your team forgets to open.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 24px 80px' }}>
        <div className="container">
          <div className="stats">
            <div className="stat">
              <div className="num"><span style={{ color: 'var(--cyan)' }}>6h</span></div>
              <div className="label">Personalized result cache</div>
            </div>
            <div className="stat">
              <div className="num"><span className="grad">5</span></div>
              <div className="label">Intent signals scored in parallel</div>
            </div>
            <div className="stat">
              <div className="num"><span style={{ color: 'var(--hot)' }}>AI</span></div>
              <div className="label">Reasoning on every score</div>
            </div>
            <div className="stat">
              <div className="num"><span style={{ color: 'var(--accent-2)' }}>$29</span></div>
              <div className="label">Starting price per month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Score detail */}
      <section className="section" id="score-section" style={{ paddingTop: '80px' }}>
        <div className="container">
          <div className="section-head">
            <div className="label"><span className="accent"></span>The Score</div>
            <h2 className="h1">A 0–100 number<br />your AE doesn&apos;t have to interpret.</h2>
            <p>One score per account, per refresh. Click in for the signals that produced it, an AI summary, and the play to run next.</p>
          </div>

          <div className="feature">
            <div style={{ position: 'relative' }}>
              <div className="feature-glow"></div>
              <div className="feature-screen">
                <div className="score-detail">
                  {/* LEFT: signals & reasoning */}
                  <div className="sd-left">
                    <div className="sd-header">
                      <div className="sd-header-top">
                        <span className="sd-id">IQ-2046</span>
                        <span className="sd-status"><span className="dot"></span>HOT · Auto-routed</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                          <button className="icon-btn">
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M3 7l3 3 5-7"/></svg>
                          </button>
                          <button className="icon-btn">
                            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="11" cy="7" r="1"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="sd-co">
                        <div className="sd-co-avatar av-1">S</div>
                        <div>
                          <div className="sd-co-name">Stripe</div>
                          <div className="sd-co-meta">
                            <span>stripe.com</span>
                            <span className="dot"></span>
                            <span>Payments · 8,400 emp.</span>
                            <span className="dot"></span>
                            <span>San Francisco, US</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sd-tabs">
                      <div className="sd-tab active">Triggers <span className="pill">4</span></div>
                      <div className="sd-tab">Activity</div>
                      <div className="sd-tab">People <span className="pill">12</span></div>
                      <div className="sd-tab">Notes</div>
                      <div className="sd-tab">Raw</div>
                    </div>

                    <div className="sd-body">
                      <div className="signal-row">
                        <div className="name"><span className="ic ic-funding"></span>Funding</div>
                        <div>
                          <div className="desc" style={{ marginBottom: '6px' }}>Series H, $6.5B at $91.5B valuation · 4 days ago</div>
                          <div className="signal-bar"><div className="fill" style={{ width: '96%', background: 'linear-gradient(90deg,#dfff00,#38a3b3)' }}></div></div>
                        </div>
                        <div className="num">96</div>
                        <div className="weight">22</div>
                      </div>
                      <div className="signal-row">
                        <div className="name"><span className="ic ic-hiring"></span>Hiring</div>
                        <div>
                          <div className="desc" style={{ marginBottom: '6px' }}>+182 open roles in Eng / RevOps · +28 vs last 30 days</div>
                          <div className="signal-bar"><div className="fill" style={{ width: '88%', background: 'linear-gradient(90deg,#4ade80,#22c55e)' }}></div></div>
                        </div>
                        <div className="num">88</div>
                        <div className="weight">19</div>
                      </div>
                      <div className="signal-row">
                        <div className="name"><span className="ic ic-news"></span>News</div>
                        <div>
                          <div className="desc" style={{ marginBottom: '6px' }}>12 non-funding trigger stories in 7 days</div>
                          <div className="signal-bar"><div className="fill" style={{ width: '92%', background: 'linear-gradient(90deg,#f5b544,#d49530)' }}></div></div>
                        </div>
                        <div className="num">92</div>
                        <div className="weight">18</div>
                      </div>
                      <div className="signal-row">
                        <div className="name"><span className="ic ic-tech"></span>Tech</div>
                        <div>
                          <div className="desc" style={{ marginBottom: '6px' }}>Dated adoption: Segment · this month</div>
                          <div className="signal-bar"><div className="fill" style={{ width: '78%', background: 'linear-gradient(90deg,#e8ff40,#dfff00)' }}></div></div>
                        </div>
                        <div className="num">78</div>
                        <div className="weight">18</div>
                      </div>
                      <div className="signal-row">
                        <div className="name"><span className="ic ic-web"></span>Web context</div>
                        <div>
                          <div className="desc" style={{ marginBottom: '6px' }}>Domain authority 92 · pricing‑page traffic +18%</div>
                          <div className="signal-bar"><div className="fill" style={{ width: '84%', background: 'linear-gradient(90deg,#8a8f98,#c0367f)' }}></div></div>
                        </div>
                        <div className="num">—</div>
                        <div className="weight">context</div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: ring + meta + AI action */}
                  <div className="sd-right">
                    <div className="sd-ring-wrap">
                      <div className="sd-ring">
                        <svg viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="scoreGradHot" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#4ade80"/>
                              <stop offset="55%" stopColor="#dfff00"/>
                              <stop offset="100%" stopColor="#e8ff40"/>
                            </linearGradient>
                          </defs>
                          <circle cx="50" cy="50" r="42" className="ring-track" strokeWidth="6" fill="none"/>
                          <circle cx="50" cy="50" r="42" className="ring-fill" strokeWidth="6" fill="none"
                            strokeLinecap="round"
                            strokeDasharray="263.9"
                            strokeDashoffset="15.8"/>
                        </svg>
                        <div className="sd-ring-center">
                          <div className="sd-ring-num">94</div>
                          <div className="sd-ring-of">/ 100</div>
                          <div className="sd-ring-delta">▲ 12 vs last week</div>
                        </div>
                      </div>
                    </div>

                    <div className="sd-meta-list">
                      <div className="sd-meta-row"><div className="key">Owner</div><div className="val"><span className="person-av">DM</span> D. Marwan</div></div>
                      <div className="sd-meta-row"><div className="key">Stage</div><div className="val">Discovery → Qualified</div></div>
                      <div className="sd-meta-row"><div className="key">Last touch</div><div className="val">2 days ago · Email</div></div>
                      <div className="sd-meta-row"><div className="key">Next refresh</div><div className="val mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>in 6h 12m</div></div>
                    </div>

                    <div className="sd-ai">
                      <div className="sd-ai-head">
                        <span className="sd-ai-dot"></span>
                        <span>AI summary</span>
                      </div>
                      <div className="sd-ai-text">
                        Stripe has three strong dated triggers. The combination of <strong>fresh capital</strong>,{' '}
                        <strong>aggressive RevOps hiring</strong>, and a <strong>positive news cycle</strong> historically
                        precedes a tooling refresh inside 60–90 days.
                      </div>
                    </div>

                    <div className="sd-action">
                      <div className="label">Recommended next action</div>
                      <div className="text">Send AE‑authored email referencing the Series H — anchor on RevOps tooling pain at $90B+ scale.</div>
                      <div className="row">
                        <button className="sd-action-btn primary">Draft in Gmail</button>
                        <button className="sd-action-btn">Save play</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Hub / Pipeline */}
      <section className="section" style={{ paddingTop: '60px' }}>
        <div className="container">
          <div className="section-head">
            <div className="label"><span className="accent"></span>Intent Hub</div>
            <h2 className="h1">Your pipeline, ranked by<br />buying intent — not last‑touch.</h2>
            <p>Every account flows across stages by score. HOT bubbles up. COLD drops out. Owners see only what&apos;s worth a call this week.</p>
          </div>

          <div className="feature-screen">
            <div className="hub">
              <div className="hub-tools">
                <div className="hub-tabs">
                  <div className="hub-tab active">
                    <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="3" height="8"/><rect x="5" y="2" width="3" height="6"/><rect x="9" y="2" width="2" height="9"/></svg>
                    Board
                  </div>
                  <div className="hub-tab">
                    <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h8M2 6h8M2 9h8"/></svg>
                    List
                  </div>
                  <div className="hub-tab">
                    <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4"/><path d="M6 2v4l3 1"/></svg>
                    Timeline
                  </div>
                </div>
                <div style={{ flex: 1 }}></div>
                <button className="toolbar-btn outlined">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M2 6h8M4 3h4M5 9h2"/></svg>
                  Filter
                </button>
                <button className="toolbar-btn outlined">
                  Group: Owner
                  <svg className="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"><path d="M3 4.5l3 3 3-3"/></svg>
                </button>
              </div>

              <div className="hub-scroll">
                <div className="hub-cols">

                  {/* COLD */}
                  <div className="hub-col">
                    <div className="hub-col-head">
                      <span className="indicator" style={{ background: 'var(--cold)' }}></span>
                      <span className="name">Cold</span>
                      <span className="count">14</span>
                      <span className="add">+</span>
                    </div>
                    <div className="hub-cards">
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2099</span>
                          <span className="priority-flag pri-low">
                            <svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="6" width="2" height="3"/></svg>
                          </span>
                        </div>
                        <div className="name">Mixpanel</div>
                        <div className="summary">No new signals. Domain authority dropped 3 pts last week.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-cold"><span className="dot"></span>38</span>
                            <span className="when">1d</span>
                          </div>
                          <div className="right"><span className="av av-2">RB</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2098</span>
                          <span className="priority-flag pri-low">
                            <svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="6" width="2" height="3"/></svg>
                          </span>
                        </div>
                        <div className="name">Heap</div>
                        <div className="summary">Stable hiring, no funding signals. Tech stack unchanged 90 days.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-cold"><span className="dot"></span>32</span>
                            <span className="when">2d</span>
                          </div>
                          <div className="right"><span className="av av-7">JS</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2071</span>
                          <span className="priority-flag pri-low"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="6" width="2" height="3"/></svg></span>
                        </div>
                        <div className="name">Amplitude</div>
                        <div className="summary">Layoff news flagged. Re-score paused for 30 days.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-cold"><span className="dot"></span>28</span>
                            <span className="when">5d</span>
                          </div>
                          <div className="right"><span className="av av-3">DM</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WARM */}
                  <div className="hub-col">
                    <div className="hub-col-head">
                      <span className="indicator" style={{ background: 'var(--warm)' }}></span>
                      <span className="name">Warming</span>
                      <span className="count">38</span>
                      <span className="add">+</span>
                    </div>
                    <div className="hub-cards">
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2095</span>
                          <span className="priority-flag pri-med"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/></svg></span>
                        </div>
                        <div className="name">Vercel</div>
                        <div className="summary">Detected Segment + Snowflake. Hiring up 12% MoM.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-warm"><span className="dot"></span>67</span>
                            <span className="when">1h</span>
                          </div>
                          <div className="right"><span className="av av-3">DM</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2094</span>
                          <span className="priority-flag pri-high"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/><rect x="8" y="1" width="2" height="8"/></svg></span>
                        </div>
                        <div className="name">Figma</div>
                        <div className="summary">Config &apos;26 keynote pricing pivot. Press cycle ramping.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-warm"><span className="dot"></span>71</span>
                            <span className="when">3h</span>
                          </div>
                          <div className="right"><span className="av av-1">JS</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2092</span>
                          <span className="priority-flag pri-med"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/></svg></span>
                        </div>
                        <div className="name">Datadog</div>
                        <div className="summary">+34 SE openings. Q2 earnings beat consensus by 11%.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-warm"><span className="dot"></span>64</span>
                            <span className="when">4h</span>
                          </div>
                          <div className="right"><span className="av av-6">AC</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2089</span>
                          <span className="priority-flag pri-med"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/></svg></span>
                        </div>
                        <div className="name">Retool</div>
                        <div className="summary">Pricing page redesign. Segment integration shipped.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-warm"><span className="dot"></span>58</span>
                            <span className="when">6h</span>
                          </div>
                          <div className="right"><span className="av av-5">RB</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HOT */}
                  <div className="hub-col">
                    <div className="hub-col-head">
                      <span className="indicator" style={{ background: 'var(--hot)', boxShadow: '0 0 8px var(--hot)' }}></span>
                      <span className="name">Hot</span>
                      <span className="count">12</span>
                      <span className="add">+</span>
                    </div>
                    <div className="hub-cards">
                      <div className="hub-card" style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'linear-gradient(180deg, rgba(74,222,128,0.03), var(--surface))' }}>
                        <div className="top">
                          <span className="iq">IQ-2046</span>
                          <span className="priority-flag pri-urgent"><svg viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="3"/></svg></span>
                        </div>
                        <div className="name">Stripe</div>
                        <div className="summary">Series H · $6.5B. Auto‑routed to D. Marwan via Autopilot.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>94</span>
                            <span className="when">3m</span>
                          </div>
                          <div className="right"><span className="av av-3">DM</span></div>
                        </div>
                      </div>
                      <div className="hub-card" style={{ borderColor: 'rgba(74,222,128,0.2)' }}>
                        <div className="top">
                          <span className="iq">IQ-2041</span>
                          <span className="priority-flag pri-urgent"><svg viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="3"/></svg></span>
                        </div>
                        <div className="name">Anthropic</div>
                        <div className="summary">Press + funding + hiring all 90+. Five axes lit.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>96</span>
                            <span className="when">14m</span>
                          </div>
                          <div className="right"><span className="av av-6">AC</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2034</span>
                          <span className="priority-flag pri-high"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/><rect x="8" y="1" width="2" height="8"/></svg></span>
                        </div>
                        <div className="name">Linear</div>
                        <div className="summary">+18 hires this quarter. Crossed 80 yesterday.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>82</span>
                            <span className="when">9m</span>
                          </div>
                          <div className="right"><span className="av av-1">JS</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-2030</span>
                          <span className="priority-flag pri-high"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/><rect x="8" y="1" width="2" height="8"/></svg></span>
                        </div>
                        <div className="name">Notion</div>
                        <div className="summary">Pricing page traffic +96%. Just shipped enterprise tier.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>78</span>
                            <span className="when">2h</span>
                          </div>
                          <div className="right"><span className="av av-5">RB</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ENGAGED */}
                  <div className="hub-col">
                    <div className="hub-col-head">
                      <span className="indicator" style={{ background: 'var(--accent-2)' }}></span>
                      <span className="name">Engaged</span>
                      <span className="count">6</span>
                      <span className="add">+</span>
                    </div>
                    <div className="hub-cards">
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-1998</span>
                          <span className="priority-flag pri-high"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/><rect x="8" y="1" width="2" height="8"/></svg></span>
                        </div>
                        <div className="name">Databricks</div>
                        <div className="summary">Reply received. Discovery call set for Thu.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>87</span>
                            <span className="when">5d</span>
                          </div>
                          <div className="right"><span className="av av-3">DM</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-1987</span>
                          <span className="priority-flag pri-med"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/></svg></span>
                        </div>
                        <div className="name">Intercom</div>
                        <div className="summary">In second-meeting. Procurement looped.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>88</span>
                            <span className="when">1w</span>
                          </div>
                          <div className="right"><span className="av av-1">JS</span></div>
                        </div>
                      </div>
                      <div className="hub-card">
                        <div className="top">
                          <span className="iq">IQ-1971</span>
                          <span className="priority-flag pri-med"><svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="5" width="2" height="4"/><rect x="5" y="3" width="2" height="6"/></svg></span>
                        </div>
                        <div className="name">Plaid</div>
                        <div className="summary">Closed–won pending. Contract sent.</div>
                        <div className="meta">
                          <div className="left">
                            <span className="band band-hot"><span className="dot"></span>91</span>
                            <span className="when">2w</span>
                          </div>
                          <div className="right"><span className="av av-6">AC</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Autopilot */}
      <section className="section" id="autopilot" style={{ paddingTop: '40px' }}>
        <div className="container">
          <div className="section-head">
            <div className="label"><span className="accent"></span>Autopilot</div>
            <h2 className="h1">Workflows that fire while<br />the buying window is open.</h2>
            <p>Trigger on score crossings, signal spikes, or pipeline events. Branch on conditions. Route, draft, notify — without leaving VesperWise.</p>
          </div>

          <div className="feature-screen">
            <div className="autopilot-canvas">
              <div className="ap-toolbar">
                <span className="ap-name">when_account_goes_hot</span>
                <span className="ap-status"><span className="dot"></span>Active · 412 fires this month</span>
                <div style={{ flex: 1 }}></div>
                <button className="toolbar-btn outlined">Test</button>
                <button className="toolbar-btn outlined">History</button>
                <button className="btn btn-secondary" style={{ height: '28px', fontSize: '13px', padding: '0 12px' }}>Edit</button>
              </div>

              <div className="ap-canvas">
                <div className="ap-bg"></div>
                <div className="ap-flow">
                  <div className="ap-node ap-trigger">
                    <div className="ap-node-head">
                      <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M7 2v5l3 2"/></svg></span>
                      Trigger
                    </div>
                    <h4>Score crosses threshold</h4>
                    <p>Account moves from WARM into HOT band</p>
                    <div className="kbd-list">
                      <span className="kbd">band → HOT</span>
                      <span className="kbd">delta ≥ +5</span>
                    </div>
                  </div>

                  <div className="ap-edge">
                    <div className="arrow"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M3 7h7M8 4l3 3-3 3"/></svg></div>
                  </div>

                  <div className="ap-node ap-condition">
                    <div className="ap-node-head">
                      <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M2 4h10M2 7h10M2 10h10"/></svg></span>
                      Condition · all
                    </div>
                    <h4>If ICP fit + segment match</h4>
                    <p>ICP score ≥ 70 AND industry ∈ {'{'}Fintech, SaaS{'}'}</p>
                    <div className="kbd-list">
                      <span className="kbd">icp_fit ≥ 70</span>
                      <span className="kbd">industry: 2</span>
                    </div>
                  </div>

                  <div className="ap-edge">
                    <div className="arrow"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M3 7h7M8 4l3 3-3 3"/></svg></div>
                  </div>

                  <div className="ap-node ap-action">
                    <div className="ap-node-head">
                      <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M2 7l3 3 7-7"/></svg></span>
                      Actions · 3
                    </div>
                    <h4>Route, draft, notify</h4>
                    <p>Owner: segment closer · Email draft from Claude · Slack #pipeline</p>
                    <div className="kbd-list">
                      <span className="kbd">route_to_owner</span>
                      <span className="kbd">draft_email</span>
                      <span className="kbd">slack_notify</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4+5: two-col (API + People + Watchlist) */}
      <section className="section" id="api" style={{ paddingTop: '40px' }}>
        <div className="container">
          <div className="section-head">
            <div className="label"><span className="accent"></span>Developers + People</div>
            <h2 className="h1">Built for sales ops<br />that actually ship.</h2>
            <p>One REST endpoint. Bulk CSV. People scoring. Watchlists. Webhooks for the systems your team already lives in.</p>
          </div>

          <div className="two-col">
            {/* API card */}
            <div className="feat-card">
              <div className="feat-head">
                <h3>One API call. Any company.</h3>
                <p>POST a domain. Get back a coverage-aware 0–100 score, four intent triggers, context, and an AI summary. Bulk endpoints support up to 1,000 companies per job.</p>
              </div>
              <div className="feat-visual">
                <div className="code-surface">
                  <div className="head">
                    <div className="dots"><i></i><i></i><i></i></div>
                    <span>POST /v1/score</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-quaternary)' }}>curl</span>
                  </div>
                  <div className="body">
                    <span className="cm-com">&#47;&#47; 200 OK · 1,420 ms</span>
                    <br />{'{'}
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;domain&quot;</span>: <span className="cm-str">&quot;stripe.com&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;score&quot;</span>: <span className="cm-num">94</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;band&quot;</span>: <span className="cm-str">&quot;HOT&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;delta_30d&quot;</span>: <span className="cm-num">+12</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;signals&quot;</span>: {'{'}
                    <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="cm-key">&quot;funding&quot;</span>: <span className="cm-num">96</span>, <span className="cm-key">&quot;hiring&quot;</span>: <span className="cm-num">88</span>,
                    <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="cm-key">&quot;news&quot;</span>: <span className="cm-num">92</span>, <span className="cm-key">&quot;tech&quot;</span>: <span className="cm-num">78</span>, <span className="cm-key">&quot;web&quot;</span>: <span className="cm-num">84</span>
                    <br />&nbsp;&nbsp;{'}'},
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;action&quot;</span>: <span className="cm-str">&quot;Reference Series H. Anchor on RevOps.&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;cached&quot;</span>: <span className="cm-bool">false</span>
                    <br />{'}'}
                  </div>
                </div>
              </div>
            </div>

            {/* People card */}
            <div className="feat-card">
              <div className="feat-head">
                <h3>Score the human, not just the logo.</h3>
                <p>Email or LinkedIn. Get back career trajectory, seniority fit, and how their company&apos;s intent backs them up. Built on Apollo + PDL fallback.</p>
              </div>
              <div className="feat-visual">
                <div className="person-list">
                  <div className="person-row">
                    <div className="av av-1">EM</div>
                    <div className="info">
                      <div className="name">Elif Marwa</div>
                      <div className="role">VP Revenue Ops · Stripe</div>
                    </div>
                    <div className="badge band-hot">HOT</div>
                    <div className="score">88</div>
                  </div>
                  <div className="person-row">
                    <div className="av av-3">JN</div>
                    <div className="info">
                      <div className="name">Jamal Norris</div>
                      <div className="role">Head of GTM Systems · Linear</div>
                    </div>
                    <div className="badge band-hot">HOT</div>
                    <div className="score">81</div>
                  </div>
                  <div className="person-row">
                    <div className="av av-6">PT</div>
                    <div className="info">
                      <div className="name">Priya Tan</div>
                      <div className="role">Director, RevOps · Notion</div>
                    </div>
                    <div className="badge band-warm">WARM</div>
                    <div className="score">72</div>
                  </div>
                  <div className="person-row">
                    <div className="av av-7">DK</div>
                    <div className="info">
                      <div className="name">Daniel Kovács</div>
                      <div className="role">Senior Manager, Sales Ops · Vercel</div>
                    </div>
                    <div className="badge band-warm">WARM</div>
                    <div className="score">64</div>
                  </div>
                  <div className="person-row">
                    <div className="av av-5">AB</div>
                    <div className="info">
                      <div className="name">Aisha Bello</div>
                      <div className="role">Sr. RevOps Analyst · Mixpanel</div>
                    </div>
                    <div className="badge band-cold">COLD</div>
                    <div className="score">41</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Watchlist + Integrations minor cards */}
          <div className="two-col" style={{ marginTop: '24px' }}>
            <div className="feat-card" style={{ minHeight: 'auto' }}>
              <div className="feat-head">
                <h3>Watchlist that pings you, not the other way around.</h3>
                <p>Pin the 250 accounts that matter. Get a tap on the shoulder the moment one crosses your band threshold.</p>
              </div>
              <div className="feat-visual">
                <div className="watch-list">
                  <div className="watch-row">
                    <div className="co"><div className="co-avatar av-2 av" style={{ width: '18px', height: '18px', borderRadius: '4px', fontSize: '9px' }}>A</div><div className="name">Anthropic</div></div>
                    <div className="watch-spark">
                      <div className="b" style={{ height: '30%' }}></div><div className="b" style={{ height: '42%' }}></div>
                      <div className="b" style={{ height: '51%' }}></div><div className="b" style={{ height: '58%' }}></div>
                      <div className="b" style={{ height: '67%' }}></div><div className="b" style={{ height: '79%' }}></div>
                      <div className="b" style={{ height: '88%', background: 'var(--hot)' }}></div><div className="b" style={{ height: '96%', background: 'var(--hot)' }}></div>
                    </div>
                    <div className="ts">▲ now</div>
                  </div>
                  <div className="watch-row">
                    <div className="co"><div className="co-avatar av-1 av" style={{ width: '18px', height: '18px', borderRadius: '4px', fontSize: '9px' }}>S</div><div className="name">Stripe</div></div>
                    <div className="watch-spark">
                      <div className="b" style={{ height: '62%' }}></div><div className="b" style={{ height: '65%' }}></div>
                      <div className="b" style={{ height: '71%' }}></div><div className="b" style={{ height: '73%' }}></div>
                      <div className="b" style={{ height: '78%' }}></div><div className="b" style={{ height: '82%' }}></div>
                      <div className="b" style={{ height: '90%', background: 'var(--hot)' }}></div><div className="b" style={{ height: '94%', background: 'var(--hot)' }}></div>
                    </div>
                    <div className="ts">3m</div>
                  </div>
                  <div className="watch-row">
                    <div className="co"><div className="co-avatar av-4 av" style={{ width: '18px', height: '18px', borderRadius: '4px', fontSize: '9px' }}>L</div><div className="name">Linear</div></div>
                    <div className="watch-spark">
                      <div className="b" style={{ height: '70%' }}></div><div className="b" style={{ height: '74%' }}></div>
                      <div className="b" style={{ height: '69%' }}></div><div className="b" style={{ height: '72%' }}></div>
                      <div className="b" style={{ height: '76%' }}></div><div className="b" style={{ height: '78%' }}></div>
                      <div className="b" style={{ height: '81%', background: 'var(--hot)' }}></div><div className="b" style={{ height: '82%', background: 'var(--hot)' }}></div>
                    </div>
                    <div className="ts">9m</div>
                  </div>
                  <div className="watch-row">
                    <div className="co"><div className="co-avatar av-7 av" style={{ width: '18px', height: '18px', borderRadius: '4px', fontSize: '9px' }}>V</div><div className="name">Vercel</div></div>
                    <div className="watch-spark">
                      <div className="b" style={{ height: '48%' }}></div><div className="b" style={{ height: '52%' }}></div>
                      <div className="b" style={{ height: '55%' }}></div><div className="b" style={{ height: '59%' }}></div>
                      <div className="b" style={{ height: '62%', background: 'var(--warm)' }}></div><div className="b" style={{ height: '65%', background: 'var(--warm)' }}></div>
                      <div className="b" style={{ height: '67%', background: 'var(--warm)' }}></div><div className="b" style={{ height: '67%', background: 'var(--warm)' }}></div>
                    </div>
                    <div className="ts">1h</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="feat-card" style={{ minHeight: 'auto' }}>
              <div className="feat-head">
                <h3>Lives where your team lives.</h3>
                <p>Webhooks, Slack, HubSpot, Salesforce, Gmail, Outreach, Apollo. Score events flow out. Pipeline updates flow back in.</p>
              </div>
              <div className="feat-visual" style={{ padding: '24px 32px 32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', width: '100%' }}>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#4A154B', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '14px' }}>#</div>
                    Slack
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FF7A59', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>Hub</div>
                    HubSpot
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#00A1E0', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>SF</div>
                    Salesforce
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EA4335', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>G</div>
                    Gmail
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#5849BE', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>Ot</div>
                    Outreach
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#1B68F1', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>Ap</div>
                    Apollo
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0070E0', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>Zp</div>
                    Zapier
                  </div>
                  <div className="integration-tile" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px dashed var(--border-strong)', display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '14px' }}>+</div>
                    Webhook
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quotes section removed - no customer testimonials yet (v0.1) */}

      {/* Pricing */}
      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head center">
            <div className="label"><span className="accent"></span>Pricing</div>
            <h2 className="h1">Start free.<br />Pay when you close.</h2>
            <p>One credit = one account scored. Bulk and re‑scores included. Cancel anytime — no annual contracts, no setup calls.</p>
          </div>

          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-name">Free</div>
              <div className="price-amt"><span className="num">$0</span><span className="per">/ mo</span></div>
              <div className="price-credits"><strong>20</strong> account scores</div>
              <div className="price-feats">
                <div className="price-feat">
                  <svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  Dashboard access
                </div>
                <div className="price-feat">
                  <svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  5 watchlist accounts
                </div>
                <div className="price-feat">
                  <svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>
                  AI summary on every score
                </div>
              </div>
              <a href="/signup" className="btn btn-secondary">Start free</a>
            </div>

            <div className="price-card">
              <div className="price-name">Starter</div>
              <div className="price-amt"><span className="num">$29</span><span className="per">/ mo</span></div>
              <div className="price-credits"><strong>500</strong> account scores · <span className="caption mono">$0.058 each</span></div>
              <div className="price-feats">
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>Everything in Free</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>50 watchlist accounts</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>API + CSV exports</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>Slack integration</div>
              </div>
              <a href="/signup" className="btn btn-secondary">Get Starter</a>
            </div>

            <div className="price-card featured">
              <div className="price-name">Growth <span className="featured-pill">Most popular</span></div>
              <div className="price-amt"><span className="num">$79</span><span className="per">/ mo</span></div>
              <div className="price-credits"><strong>2,500</strong> account scores · <span className="caption mono">$0.032 each</span></div>
              <div className="price-feats">
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>Everything in Starter</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>250 watchlist accounts</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>20 Autopilot workflows</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>Bulk scoring (1,000 / job)</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>HubSpot + Salesforce</div>
              </div>
              <a href="/signup" className="btn btn-accent">Get Growth →</a>
            </div>

            <div className="price-card">
              <div className="price-name">Pro</div>
              <div className="price-amt"><span className="num">$199</span><span className="per">/ mo</span></div>
              <div className="price-credits"><strong>8,000</strong> account scores · <span className="caption mono">$0.025 each</span></div>
              <div className="price-feats">
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>Everything in Growth</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>1,000 watchlist accounts</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>People scoring</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>50 Autopilot workflows</div>
                <div className="price-feat"><svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l3 3 5-7"/></svg>Priority support</div>
              </div>
              <a href="/signup" className="btn btn-secondary">Get Pro</a>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '12px', color: 'var(--text-quaternary)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
            Need 25,000+ scores? <a href="/contact#contact-form" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textDecorationColor: 'var(--border-strong)' }}>Contact us for Agency pricing ($499/mo) →</a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-bg"></div>
        <div className="cta-grid"></div>
        <div className="cta-inner">
          <h2><span className="grad">Set the pace<br />of your pipeline.</span></h2>
          <p>Every day you wait, a competitor scores your best prospects and books the meeting first.</p>
          <div className="cta-actions">
            <a href="/signup" className="btn btn-accent btn-lg">
              Start scoring free
              <svg className="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h6M7 4l2 2-2 2"/></svg>
            </a>
            <a href="/contact#contact-form" className="btn btn-secondary btn-lg">Contact us</a>
          </div>
          <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-quaternary)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
            20 FREE CREDITS · NO CARD · COVERAGE-AWARE SCORES
          </p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
