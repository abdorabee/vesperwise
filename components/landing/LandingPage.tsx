import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/site-footer";
import StickyMobileCta from "@/components/landing/sticky-mobile-cta";
import { PLAN_AUTOPILOT_LIMIT, PLAN_CREDITS, PLAN_WATCHLIST_LIMIT } from "@/lib/types";

const ACCOUNTS = [
  { initial: "S", name: "Stripe", domain: "stripe.com", score: 94, band: "HOT", signal: "Series H, four days ago" },
  { initial: "L", name: "Linear", domain: "linear.app", score: 82, band: "HOT", signal: "18 engineering hires this quarter" },
  { initial: "A", name: "Anthropic", domain: "anthropic.com", score: 78, band: "HOT", signal: "Funding, hiring, and press this month" },
  { initial: "V", name: "Vercel", domain: "vercel.com", score: 67, band: "WARM", signal: "Segment and Snowflake detected" },
  { initial: "N", name: "Notion", domain: "notion.so", score: 54, band: "WARM", signal: "Enterprise tier just shipped" },
] as const;

const TRIGGERS = [
  { key: "funding", name: "Funding", reading: 98, points: 28, desc: "Series H, $6.5B at a $91.5B valuation · 4 days ago", icon: "ic-funding" },
  { key: "hiring", name: "Hiring", reading: 89, points: 22, desc: "+182 open roles in Eng and RevOps · +28 vs last 30 days", icon: "ic-hiring" },
  { key: "news", name: "News", reading: 94, points: 22, desc: "12 non-funding trigger stories in 7 days", icon: "ic-news" },
  { key: "technology", name: "Technology", reading: 94, points: 22, desc: "Dated adoption: Segment · this month", icon: "ic-tech" },
] as const;

function Check() {
  return (
    <svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7l3 3 5-7" />
    </svg>
  );
}

const PLANS = [
  {
    name: "Free",
    price: "$0",
    credits: PLAN_CREDITS.free,
    unit: null,
    features: [
      "Dashboard access",
      `${PLAN_WATCHLIST_LIMIT.free} watchlist accounts`,
      "AI summary on every score",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Starter",
    price: "$29",
    credits: PLAN_CREDITS.starter,
    unit: "$0.058 each",
    features: [
      "Everything in Free",
      `${PLAN_WATCHLIST_LIMIT.starter} watchlist accounts`,
      "API + CSV exports",
      `${PLAN_AUTOPILOT_LIMIT.starter} Autopilot workflows`,
    ],
    cta: "Get Starter",
    featured: false,
  },
  {
    name: "Growth",
    price: "$79",
    credits: PLAN_CREDITS.growth,
    unit: "$0.032 each",
    features: [
      "Everything in Starter",
      `${PLAN_WATCHLIST_LIMIT.growth} watchlist accounts`,
      `${PLAN_AUTOPILOT_LIMIT.growth} Autopilot workflows`,
      "Bulk scoring (1,000 / job)",
    ],
    cta: "Get Growth",
    featured: true,
  },
  {
    name: "Pro",
    price: "$199",
    credits: PLAN_CREDITS.pro,
    unit: "$0.025 each",
    features: [
      "Everything in Growth",
      `${PLAN_WATCHLIST_LIMIT.pro} watchlist accounts`,
      "People scoring",
      `${PLAN_AUTOPILOT_LIMIT.pro} Autopilot workflows`,
      "Priority support",
    ],
    cta: "Get Pro",
    featured: false,
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <LandingNav />

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-inner">
          <h1>
            <span className="grad">Pipeline intelligence</span>
            <br />
            for B2B sales teams.
          </h1>
          <p className="lead">
            Paste a domain. Get one 0–100 buying-intent score, the four triggers behind it, and the email to send next.
          </p>
          <div className="hero-actions">
            <a href="/signup" className="btn btn-accent btn-lg">
              Start scoring free
            </a>
          </div>
          <p className="hero-meta">
            <strong>20 free credits</strong>. No credit card.
          </p>
        </div>

        <div className="hero-list-wrap">
          <div className="score-list" aria-label="Sample account scores">
            <div className="score-list-head">
              <span>Account</span>
              <span>Band</span>
              <span>Score</span>
            </div>
            {ACCOUNTS.map((account) => (
              <div key={account.domain} className="score-list-row">
                <div className="score-list-co">
                  <span className={`score-list-av av-${account.initial === "S" ? "1" : account.initial === "L" ? "4" : account.initial === "A" ? "2" : account.initial === "V" ? "7" : "3"}`}>
                    {account.initial}
                  </span>
                  <span>
                    <span className="score-list-name">{account.name}</span>
                    <span className="score-list-domain">{account.domain} · {account.signal}</span>
                  </span>
                </div>
                <span className={`score-list-band ${account.band === "HOT" ? "is-hot" : "is-warm"}`}>{account.band}</span>
                <span className="score-list-score">{account.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="product">
        <div className="container">
          <div className="section-head center">
            <h2 className="h1">Stop guessing.<br /><span className="muted">Start scoring.</span></h2>
            <p>Four dated purchase triggers — funding, hiring, news, and technology change — become one score, then the next email.</p>
          </div>
          <div className="pillars">
            <div className="pillar">
              <h3>Four triggers</h3>
              <p>Funding, hiring velocity, non-funding news, and a dated tech-stack change. Each one is freshness-decayed. Web and GitHub stay beside the score as context.</p>
            </div>
            <div className="pillar">
              <h3>One score</h3>
              <p>The four contributions add up to a single 0–100 number. HOT is 75 or above. WARM is 50 or above. Anything lower is COLD.</p>
            </div>
            <div className="pillar">
              <h3>The next email</h3>
              <p>A short buying thesis and one recommended action you can send. The draft waits for a person. VesperWise does not send it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="score-section">
        <div className="container">
          <div className="section-head">
            <h2 className="h1">A 0–100 number<br />your AE doesn&apos;t have to interpret.</h2>
            <p>Stripe, scored from the same four triggers as the list above. The points on the right add up to 94.</p>
          </div>

          <div className="feature">
            <div className="feature-screen">
              <div className="score-detail">
                <div className="sd-left">
                  <div className="sd-header">
                    <div className="sd-co">
                      <div className="sd-co-avatar av-1">S</div>
                      <div>
                        <div className="sd-co-name">Stripe</div>
                        <div className="sd-co-meta">
                          <span>stripe.com</span>
                          <span className="dot" />
                          <span>Payments · San Francisco</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="sd-body">
                    {TRIGGERS.map((trigger) => (
                      <div className="signal-row" key={trigger.key}>
                        <div className="name"><span className={`ic ${trigger.icon}`} />{trigger.name}</div>
                        <div>
                          <div className="desc" style={{ marginBottom: 6 }}>{trigger.desc}</div>
                          <div className="signal-bar">
                            <div className="fill" style={{ width: `${trigger.reading}%`, background: "var(--brand)" }} />
                          </div>
                        </div>
                        <div className="num">{trigger.reading}</div>
                        <div className="weight">+{trigger.points}</div>
                      </div>
                    ))}
                    <div className="signal-row">
                      <div className="name"><span className="ic ic-web" />Web context</div>
                      <div>
                        <div className="desc">Domain authority 92. Shown beside the score. It does not add points.</div>
                      </div>
                      <div className="num">—</div>
                      <div className="weight">context</div>
                    </div>
                  </div>
                </div>

                <div className="sd-right">
                  <div className="sd-ring-wrap">
                    <div className="sd-ring">
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                        <defs>
                          <linearGradient id="scoreGradHot" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="var(--brand)" />
                            <stop offset="100%" stopColor="#e8ff40" />
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="42" className="ring-track" strokeWidth="6" fill="none" />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          className="ring-fill"
                          strokeWidth="6"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="263.9"
                          strokeDashoffset="15.8"
                        />
                      </svg>
                      <div className="sd-ring-center">
                        <div className="sd-ring-num">94</div>
                        <div className="sd-ring-of">/ 100</div>
                        <div className="sd-ring-delta">HOT · 28+22+22+22</div>
                      </div>
                    </div>
                  </div>
                  <div className="sd-ai">
                    <div className="sd-ai-head">
                      <span className="sd-ai-dot" />
                      <span>AI summary</span>
                    </div>
                    <div className="sd-ai-text">
                      Stripe has four dated triggers. Fresh capital, RevOps hiring, a busy news week, and a new tool in the stack usually precede a tooling refresh inside 60–90 days.
                    </div>
                  </div>
                  <div className="sd-action">
                    <div className="label">Recommended next action</div>
                    <div className="text">Send an email that references the Series H and asks about RevOps tooling at this scale.</div>
                    <div className="row">
                      <a href="/signup" className="sd-action-btn primary">Score a company</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="api">
        <div className="container">
          <div className="section-head">
            <h2 className="h1">One API call.<br />The same score.</h2>
            <p>POST a domain. The response is the 0–100 score, the four trigger readings, and the next action. Bulk jobs score up to 1,000 companies and spend one credit each.</p>
          </div>
          <div className="two-col">
            <div className="feat-card">
              <div className="feat-head">
                <h3>POST /v1/score</h3>
                <p>The readings below are the same Stripe example. Points, not the raw readings, are what add up to 94.</p>
              </div>
              <div className="feat-visual">
                <div className="code-surface">
                  <div className="head">
                    <div className="dots"><i /><i /><i /></div>
                    <span>200 OK</span>
                  </div>
                  <div className="body">
                    {"{"}
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;domain&quot;</span>: <span className="cm-str">&quot;stripe.com&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;score&quot;</span>: <span className="cm-num">94</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;band&quot;</span>: <span className="cm-str">&quot;HOT&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;signals&quot;</span>: {"{"}
                    <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="cm-key">&quot;funding&quot;</span>: <span className="cm-num">98</span>, <span className="cm-key">&quot;hiring&quot;</span>: <span className="cm-num">89</span>,
                    <br />&nbsp;&nbsp;&nbsp;&nbsp;<span className="cm-key">&quot;news&quot;</span>: <span className="cm-num">94</span>, <span className="cm-key">&quot;technology&quot;</span>: <span className="cm-num">94</span>
                    <br />&nbsp;&nbsp;{"}"},
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;action&quot;</span>: <span className="cm-str">&quot;Reference the Series H. Ask about RevOps tooling.&quot;</span>
                    <br />{"}"}
                  </div>
                </div>
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-head">
                <h3>A webhook when the score is ready.</h3>
                <p>Point a URL at VesperWise. We POST the score event. CRM sync is not part of the product yet.</p>
              </div>
              <div className="feat-visual">
                <div className="code-surface">
                  <div className="head">
                    <div className="dots"><i /><i /><i /></div>
                    <span>score.ready</span>
                  </div>
                  <div className="body">
                    {"{"}
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;event&quot;</span>: <span className="cm-str">&quot;score.ready&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;domain&quot;</span>: <span className="cm-str">&quot;stripe.com&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;score&quot;</span>: <span className="cm-num">94</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;band&quot;</span>: <span className="cm-str">&quot;HOT&quot;</span>
                    <br />{"}"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head center">
            <h2 className="h1">Start free.<br />Pay when you close.</h2>
            <p>One credit = one account scored. Bulk jobs spend one credit per company. A re-score within 6 hours is free.</p>
          </div>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div key={plan.name} className={plan.featured ? "price-card featured" : "price-card"}>
                <div className="price-name">
                  {plan.name}
                  {plan.featured ? <span className="featured-pill">Most popular</span> : null}
                </div>
                <div className="price-amt"><span className="num">{plan.price}</span><span className="per">/ mo</span></div>
                <div className="price-credits">
                  <strong>{plan.credits}</strong> account scores
                  {plan.unit ? <> · {plan.unit}</> : null}
                </div>
                <div className="price-feats">
                  {plan.features.map((feature) => (
                    <div key={feature} className="price-feat"><Check />{feature}</div>
                  ))}
                </div>
                <a href="/signup" className={plan.featured ? "btn btn-accent" : "btn btn-secondary"}>{plan.cta}</a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "var(--text-tertiary)" }}>
            Need 25,000+ scores? <a href="/contact#contact-form" style={{ color: "var(--text-secondary)", textDecoration: "underline" }}>Contact us for Agency pricing ($499/mo)</a>
          </p>
        </div>
      </section>

      <section className="cta">
        <div className="cta-bg" />
        <div className="cta-inner">
          <h2><span className="grad">Score the next account.</span></h2>
          <p>Twenty free credits. The first result is a band, a number, and a next step.</p>
          <div className="cta-actions">
            <a href="/signup" className="btn btn-accent btn-lg">Start scoring free</a>
          </div>
        </div>
      </section>

      <SiteFooter />
      <StickyMobileCta />
    </>
  );
}
