import type { ReactNode } from "react";
import LandingNav from "@/components/landing/LandingNav";
import StickyMobileCta from "@/components/landing/sticky-mobile-cta";
import HeroVideo from "@/components/landing/hero-video";
import SiteFooter from "@/components/site-footer";
import {
  DEMO_ACCOUNTS,
  DEMO_PEOPLE,
  bandFor,
  demoAccount,
  type DemoAccount,
  type DemoBand,
} from "@/components/landing/demo-accounts";
import { BULK_MAX_PER_JOB, MARKETING_PLANS, formatCount, getMarketingPlan } from "@/lib/plan-features";
import { PLAN_CREDITS } from "@/lib/types";

const BAND_VAR: Record<DemoBand, string> = { HOT: "var(--hot)", WARM: "var(--warm)", COLD: "var(--cold)" };
const BAND_CLASS: Record<DemoBand, string> = { HOT: "band-hot", WARM: "band-warm", COLD: "band-cold" };
const AVATAR_CLASSES = ["av-1", "av-4", "av-2", "av-7", "av-3", "av-5", "av-6"];

function avatarClass(domain: string): string {
  const i = DEMO_ACCOUNTS.findIndex((a) => a.domain === domain);
  return AVATAR_CLASSES[(i < 0 ? 0 : i) % AVATAR_CLASSES.length];
}

function Check() {
  return (
    <svg className="chk" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 7l3 3 5-7" />
    </svg>
  );
}

/** Wraps a decorative product mockup so it is skipped by keyboard and screen readers. */
function Mockup({ children, caption = true }: { children: ReactNode; caption?: boolean }) {
  return (
    <figure className="landing-mockup">
      <div aria-hidden="true" inert>
        {children}
      </div>
      {caption ? <figcaption className="landing-mockup-caption">Illustrative data</figcaption> : null}
    </figure>
  );
}

function HubCard({ account }: { account: DemoAccount }) {
  const band = bandFor(account.score);
  return (
    <div className="hub-card">
      <div className="name">{account.domain}</div>
      <div className="summary">{account.summary}</div>
      <div className="meta">
        <div className="left">
          <span className={`band ${BAND_CLASS[band]}`}><span className="dot"></span>{account.score}</span>
          <span className="when">{account.updated}</span>
        </div>
        <div className="right">
          {account.owner ? <span className={`av ${avatarClass(account.domain)}`}>{account.owner.initials}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const featured = DEMO_ACCOUNTS[0];
  const featuredBand = bandFor(featured.score);
  const hubColumns: { band: DemoBand; label: string }[] = [
    { band: "HOT", label: "Hot" },
    { band: "WARM", label: "Warm" },
    { band: "COLD", label: "Cold" },
  ];
  const teaserPlans = MARKETING_PLANS.filter((p) => p.key !== "agency");
  const agency = getMarketingPlan("agency");
  const signalRows: { key: keyof DemoAccount["mix"]; label: string; icon: string; desc: string; context?: boolean }[] = [
    { key: "funding", label: "Funding", icon: "ic-funding", desc: "Series B announced 4 days ago" },
    { key: "hiring", label: "Hiring", icon: "ic-hiring", desc: "+22 open roles in Engineering and RevOps vs. last month" },
    { key: "news", label: "News", icon: "ic-news", desc: "3 product and partnership stories in 7 days" },
    { key: "tech", label: "Tech", icon: "ic-tech", desc: "Added a CDP to the stack this month" },
    { key: "web", label: "Web context", icon: "ic-web", desc: "Pricing page updated this week", context: true },
  ];

  return (
    <>
      {/* Top banner */}
      <div className="top-banner">
        <a href="#autopilot" style={{ display: "inline-flex", alignItems: "center" }}>
          <span className="pill">New</span>
          <span><strong>Autopilot</strong>: alert the right rep when an account turns HOT</span>
        </a>
      </div>

      <LandingNav />

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg"></div>

        <div className="hero-inner">
          <h1>See which accounts are ready to buy this week.</h1>
          <p className="lead">
            VesperWise scores any company from 0 to 100 using dated funding, hiring, news and tech-stack signals,
            shows the evidence behind the number, and suggests what your rep should do next.
          </p>
          <div className="hero-actions">
            <a href="/signup" className="btn btn-accent btn-lg">
              Start scoring free
              <svg className="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h6M7 4l2 2-2 2" /></svg>
            </a>
            <a href="/contact#contact-form" className="btn btn-secondary btn-lg">
              Book a demo
            </a>
          </div>
          <div className="hero-meta">
            <strong>{PLAN_CREDITS.free} free scores</strong>, no credit card
          </div>
        </div>

        <HeroVideo />
      </section>

      {/* Pillars: signal → reason → act is a real sequence */}
      <section className="section" id="product">
        <div className="container">
          <div className="section-head center">
            <h2 className="h1">From raw signals to<br /><span className="muted">a call worth making.</span></h2>
            <p>Four dated purchase triggers (funding, hiring, news and tech-stack changes) roll up into one score. Website and GitHub activity add context.</p>
          </div>
        </div>

        <div className="pillars">
          <div className="pillar">
            <div className="pillar-num">1. Signal</div>
            <h3>Four triggers, each with a date and a source.</h3>
            <p>Older signals count for less, and every score shows how much data backs it, so a thin score never passes for a strong one.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">2. Reason</div>
            <h3>A summary you could paste to your manager.</h3>
            <p>Each score comes with a two-line reason the account matters now, a talk track and a recommended next step.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">3. Act</div>
            <h3>Alerts while the window is open.</h3>
            <p>When an account crosses 75 it can move pipeline stage, draft an email and post to Slack or your webhook.</p>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="landing-facts-section">
        <div className="container">
          <div className="stats">
            <div className="stat">
              <div className="num">4</div>
              <div className="label">Dated purchase triggers behind every score</div>
            </div>
            <div className="stat">
              <div className="num">75+</div>
              <div className="label">HOT: the accounts worth a call this week</div>
            </div>
            <div className="stat">
              <div className="num">6h</div>
              <div className="label">Re-check the same company free for 6 hours</div>
            </div>
            <div className="stat">
              <div className="num">{PLAN_CREDITS.free}</div>
              <div className="label">Free scores to start, no card</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Score detail */}
      <section className="section section-tight" id="score-section">
        <div className="container">
          <div className="section-head">
            <h2 className="h1">A 0–100 number<br />your AE doesn&apos;t have to interpret.</h2>
            <p>One score per account. Open it for the signals that produced it, the summary and the next step.</p>
          </div>

          <Mockup>
            <div className="feature">
              <div className="feature-screen">
                <div className="score-detail">
                  <div className="sd-left">
                    <div className="sd-header">
                      <div className="sd-header-top">
                        <span className="sd-status"><span className="dot"></span>{featuredBand}</span>
                      </div>
                      <div className="sd-co">
                        <div className={`sd-co-avatar ${avatarClass(featured.domain)}`}>{featured.name[0]}</div>
                        <div>
                          <div className="sd-co-name">{featured.name}</div>
                          <div className="sd-co-meta">
                            <span>{featured.domain}</span>
                            <span className="dot"></span>
                            <span>B2B software · 240 employees</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sd-tabs">
                      <div className="sd-tab active">Triggers <span className="pill">4</span></div>
                      <div className="sd-tab">History</div>
                    </div>

                    <div className="sd-body">
                      {signalRows.map((row) => (
                        <div key={row.key} className="signal-row">
                          <div className="name"><span className={`ic ${row.icon}`}></span>{row.label}</div>
                          <div>
                            <div className="desc" style={{ marginBottom: "6px" }}>{row.desc}</div>
                            <div className="signal-bar"><div className="fill" style={{ width: `${featured.mix[row.key]}%`, background: row.context ? "var(--text-quaternary)" : "var(--foreground)" }}></div></div>
                          </div>
                          <div className="num">{row.context ? "—" : featured.mix[row.key]}</div>
                          <div className="weight">{row.context ? "context" : ""}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sd-right">
                    <div className="sd-ring-wrap">
                      <div className="sd-ring">
                        <svg viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" className="ring-track" strokeWidth="6" fill="none" />
                          <circle cx="50" cy="50" r="42" className="ring-fill" strokeWidth="6" fill="none"
                            strokeLinecap="round"
                            strokeDasharray="263.9"
                            strokeDashoffset={(263.9 * (1 - featured.score / 100)).toFixed(1)} />
                        </svg>
                        <div className="sd-ring-center">
                          <div className="sd-ring-num">{featured.score}</div>
                          <div className="sd-ring-of">/ 100</div>
                          <div className="sd-ring-delta">▲ {featured.delta} vs last week</div>
                        </div>
                      </div>
                    </div>

                    <div className="sd-meta-list">
                      <div className="sd-meta-row"><div className="key">Owner</div><div className="val">{featured.owner?.name}</div></div>
                      <div className="sd-meta-row"><div className="key">Stage</div><div className="val">Evaluating</div></div>
                      <div className="sd-meta-row"><div className="key">Data coverage</div><div className="val">4 of 4 triggers</div></div>
                    </div>

                    <div className="sd-ai">
                      <div className="sd-ai-head">
                        <span className="sd-ai-dot"></span>
                        <span>Why now</span>
                      </div>
                      <div className="sd-ai-text">
                        {featured.name} has <strong>fresh capital</strong>, <strong>RevOps hiring</strong> and a
                        {" "}<strong>new CDP</strong> in the same month. That mix often comes before a tooling review.
                      </div>
                    </div>

                    <div className="sd-action">
                      <div className="label">Recommended next step</div>
                      <div className="text">Email the VP Revenue Ops. Reference the Series B and offer a pipeline review.</div>
                      <div className="row">
                        <span className="sd-action-btn primary">Draft outreach</span>
                        <span className="sd-action-btn">Add to watchlist</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Mockup>
        </div>
      </section>

      {/* Feature 2: Pipeline by band */}
      <section className="section section-tight">
        <div className="container">
          <div className="section-head">
            <h2 className="h1">Your pipeline, ranked by<br />buying intent, not last touch.</h2>
            <p>Accounts group by band as scores change. HOT rises to the top, COLD drops back, and reps see what is worth a call this week.</p>
          </div>

          <Mockup>
            <div className="feature-screen">
              <div className="hub">
                <div className="hub-scroll">
                  <div className="hub-cols landing-hub-cols">
                    {hubColumns.map(({ band, label }) => {
                      const accounts = DEMO_ACCOUNTS.filter((a) => bandFor(a.score) === band);
                      return (
                        <div key={band} className="hub-col">
                          <div className="hub-col-head">
                            <span className="indicator" style={{ background: BAND_VAR[band] }}></span>
                            <span className="name">{label}</span>
                            <span className="count">{accounts.length}</span>
                          </div>
                          <div className="hub-cards">
                            {accounts.map((a) => <HubCard key={a.domain} account={a} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Mockup>
        </div>
      </section>

      {/* Feature 3: Autopilot */}
      <section className="section section-tight" id="autopilot">
        <div className="container">
          <div className="section-head">
            <h2 className="h1">Workflows that fire while<br />the buying window is open.</h2>
            <p>Trigger on a score crossing, a band change or a signal spike, then act: move the pipeline stage, draft an email, post to Slack or call a webhook.</p>
          </div>

          <Mockup>
            <div className="feature-screen">
              <div className="autopilot-canvas">
                <div className="ap-toolbar">
                  <span className="ap-name">When an account turns HOT</span>
                  <span className="ap-status"><span className="dot"></span>Active</span>
                </div>

                <div className="ap-canvas">
                  <div className="ap-bg"></div>
                  <div className="ap-flow">
                    <div className="ap-node ap-trigger">
                      <div className="ap-node-head">
                        <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M7 2v5l3 2" /></svg></span>
                        Trigger
                      </div>
                      <h4>Score crosses 75</h4>
                      <p>Account moves from WARM into HOT</p>
                      <div className="kbd-list">
                        <span className="kbd">band_change → HOT</span>
                      </div>
                    </div>

                    <div className="ap-edge">
                      <div className="arrow"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M3 7h7M8 4l3 3-3 3" /></svg></div>
                    </div>

                    <div className="ap-node ap-condition">
                      <div className="ap-node-head">
                        <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M2 4h10M2 7h10M2 10h10" /></svg></span>
                        Condition
                      </div>
                      <h4>Score jumped this week</h4>
                      <p>Up at least 10 points since the last score</p>
                      <div className="kbd-list">
                        <span className="kbd">score_change ≥ +10</span>
                      </div>
                    </div>

                    <div className="ap-edge">
                      <div className="arrow"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M3 7h7M8 4l3 3-3 3" /></svg></div>
                    </div>

                    <div className="ap-node ap-action">
                      <div className="ap-node-head">
                        <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M2 7l3 3 7-7" /></svg></span>
                        Actions
                      </div>
                      <h4>Stage, draft, notify</h4>
                      <p>Move to Qualified · Draft an email · Post to #pipeline</p>
                      <div className="kbd-list">
                        <span className="kbd">pipeline_stage</span>
                        <span className="kbd">email_draft</span>
                        <span className="kbd">slack</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Mockup>
        </div>
      </section>

      {/* Developers + people + watchlist + integrations */}
      <section className="section section-tight" id="api">
        <div className="container">
          <div className="section-head">
            <h2 className="h1">Built for sales ops<br />that actually ship.</h2>
            <p>A REST API with key auth, CSV upload and export, people scoring and watchlists.</p>
          </div>

          <div className="two-col">
            <div className="feat-card">
              <div className="feat-head">
                <h3>One API call. Any company.</h3>
                <p>POST a domain and get back a 0–100 score, its band, the reason it matters now and a next step. Bulk jobs take up to {formatCount(BULK_MAX_PER_JOB)} companies. <a href="/docs">Read the API docs</a>.</p>
              </div>
              <div className="feat-visual" aria-hidden="true">
                <div className="code-surface">
                  <div className="head">
                    <div className="dots"><i></i><i></i><i></i></div>
                    <span>POST /api/v1/score</span>
                  </div>
                  <div className="body">
                    <span className="cm-com">&#47;&#47; 200 OK</span>
                    <br />{"{"}
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;domain&quot;</span>: <span className="cm-str">&quot;{featured.domain}&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;intent_score&quot;</span>: <span className="cm-num">{featured.score}</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;score_band&quot;</span>: <span className="cm-str">&quot;{featuredBand}&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;data_coverage&quot;</span>: <span className="cm-num">1</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;why_now&quot;</span>: <span className="cm-str">&quot;Series B 4 days ago; RevOps hiring.&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;recommended_action&quot;</span>: <span className="cm-str">&quot;Email the VP Revenue Ops.&quot;</span>,
                    <br />&nbsp;&nbsp;<span className="cm-key">&quot;cached&quot;</span>: <span className="cm-bool">false</span>
                    <br />{"}"}
                  </div>
                </div>
              </div>
            </div>

            <div className="feat-card">
              <div className="feat-head">
                <h3>Score the person, not just the logo.</h3>
                <p>Give an email or LinkedIn URL. Get back seniority fit, recent job changes and how strongly their company is showing intent.</p>
              </div>
              <div className="feat-visual">
                <Mockup caption={false}>
                  <div className="person-list">
                    {DEMO_PEOPLE.map((p) => {
                      const band = bandFor(p.score);
                      return (
                        <div key={p.name} className="person-row">
                          <div className={`av ${avatarClass(p.domain)}`}>{p.initials}</div>
                          <div className="info">
                            <div className="name">{p.name}</div>
                            <div className="role">{p.role} · {demoAccount(p.domain).name}</div>
                          </div>
                          <div className={`badge ${BAND_CLASS[band]}`}>{band}</div>
                          <div className="score">{p.score}</div>
                        </div>
                      );
                    })}
                  </div>
                </Mockup>
              </div>
            </div>
          </div>

          <div className="two-col landing-two-col-gap">
            <div className="feat-card" style={{ minHeight: "auto" }}>
              <div className="feat-head">
                <h3>A watchlist that tells you when to call.</h3>
                <p>Pin the accounts that matter and get alerted when one crosses your band threshold.</p>
              </div>
              <div className="feat-visual">
                <Mockup caption={false}>
                  <div className="watch-list">
                    {DEMO_ACCOUNTS.slice(0, 4).map((a) => (
                      <div key={a.domain} className="watch-row">
                        <div className="co">
                          <div className={`co-avatar av ${avatarClass(a.domain)}`} style={{ width: "18px", height: "18px", borderRadius: "4px", fontSize: "9px" }}>{a.name[0]}</div>
                          <div className="name">{a.domain}</div>
                        </div>
                        <div className="watch-spark">
                          {a.trend.map((v, i) => (
                            <div key={i} className="b" style={{ height: `${v}%`, ...(bandFor(v) !== "COLD" ? { background: BAND_VAR[bandFor(v)] } : {}) }}></div>
                          ))}
                        </div>
                        <div className="ts">{a.score}</div>
                      </div>
                    ))}
                  </div>
                </Mockup>
              </div>
            </div>

            <div className="feat-card" style={{ minHeight: "auto" }}>
              <div className="feat-head">
                <h3>Sends alerts where your team works.</h3>
                <p>Autopilot posts to Slack or any webhook. Everything else goes through the REST API or a CSV export.</p>
              </div>
              <div className="feat-visual landing-integrations">
                <ul className="landing-integration-list">
                  <li><span className="landing-integration-mark" aria-hidden="true">#</span>Slack</li>
                  <li><span className="landing-integration-mark" aria-hidden="true">{"{}"}</span>Webhook</li>
                  <li><span className="landing-integration-mark" aria-hidden="true">/</span>REST API</li>
                  <li><span className="landing-integration-mark" aria-hidden="true">,</span>CSV</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head center">
            <h2 className="h1">Start free.<br />Pay for the accounts you score.</h2>
            <p>One credit scores one company. Re-checking the same company within 6 hours is free. Month-to-month, cancel anytime.</p>
          </div>

          <div className="pricing-grid">
            {teaserPlans.map((plan) => (
              <div key={plan.key} className={`price-card${plan.featured ? " featured" : ""}`}>
                <div className="price-name">
                  {plan.label} {plan.featured ? <span className="featured-pill">Most popular</span> : null}
                </div>
                <div className="price-amt"><span className="num">${plan.price}</span><span className="per">/ mo</span></div>
                <div className="price-credits">
                  <strong>{formatCount(plan.credits)}</strong> account scores
                  {plan.perScore ? <> · <span className="caption">{plan.perScore}</span></> : null}
                </div>
                <div className="price-feats">
                  {plan.features.map((feat) => (
                    <div key={feat} className="price-feat"><Check />{feat}</div>
                  ))}
                </div>
                <a href="/signup" className={`btn ${plan.featured ? "btn-accent" : "btn-secondary"}`}>{plan.cta}</a>
              </div>
            ))}
          </div>

          <p className="landing-pricing-note">
            Need more? {agency.label} is ${agency.price}/mo for {formatCount(agency.credits)} scores, and top-up packs start at 100 credits.{" "}
            <a href="/pricing">See all plans</a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-bg"></div>
        <div className="cta-grid"></div>
        <div className="cta-inner">
          <h2>Find out who is ready to buy.</h2>
          <p>Score your own target accounts and see the evidence behind each number.</p>
          <div className="cta-actions">
            <a href="/signup" className="btn btn-accent btn-lg">
              Start scoring free
              <svg className="arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h6M7 4l2 2-2 2" /></svg>
            </a>
            <a href="/contact#contact-form" className="btn btn-secondary btn-lg">Contact us</a>
          </div>
          <p className="landing-cta-meta">{PLAN_CREDITS.free} free scores. No credit card.</p>
        </div>
      </section>

      <SiteFooter />
      <StickyMobileCta />
    </>
  );
}
