import { getPlanDef, type PlanKey } from "@/lib/billing-plans";
import type { BillingStats } from "@/lib/billing-stats";
import { daysUntilReset, formatRenewDate } from "@/lib/billing-stats";

interface BillingHeroProps {
  stats: BillingStats;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
      <path d="M2 6.5l2.5 2.5L10 3.5" />
    </svg>
  );
}

export function BillingHero({ stats }: BillingHeroProps) {
  const plan = (stats.profile.plan ?? "free") as PlanKey;
  const def = getPlanDef(plan);
  const renewDate = formatRenewDate(stats.profile.subscription_renews_at);
  const daysLeft = daysUntilReset(stats.profile.subscription_renews_at);
  const isPaid = plan !== "free" && !!stats.profile.polar_subscription_id;
  const cancelScheduled = stats.profile.subscription_cancel_at_period_end ?? false;

  const usedPct = stats.totalCredits > 0 ? (stats.usedCredits / stats.totalCredits) * 100 : 0;
  const remaining = stats.creditsRemaining;

  let projPct = 0;
  if (stats.burnRate7d > 0 && daysLeft != null && daysLeft > 0) {
    const projectedExtra = Math.min(
      stats.burnRate7d * daysLeft,
      remaining,
    );
    projPct = stats.totalCredits > 0 ? (projectedExtra / stats.totalCredits) * 100 : 0;
  }

  const costPerCredit =
    def.price > 0 && def.credits > 0 ? `$${(def.price / def.credits).toFixed(2)}` : "—";

  // Top-ups are charged when bought, so the next invoice is just the plan renewal.
  const hasNextInvoice = isPaid && !cancelScheduled;
  const invoiceTotal = hasNextInvoice ? def.price : 0;
  // Billing projections are intentionally anchored to the current render snapshot.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const depleteDate =
    stats.daysUntilDeplete != null
      ? new Date(now + stats.daysUntilDeplete * 86400000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;

  const eyebrowWarn = stats.depletesBeforeRenewal;

  return (
    <div className="bill-hero">
      <div className="hero-card plan">
        <div className="hc-eyebrow">
          <span className="pin" />
          CURRENT PLAN · {cancelScheduled ? "CANCELLING" : isPaid ? "ACTIVE" : "FREE"}
        </div>

        <div className="plan-tier-row">
          <div className="plan-tier-name">{def.label}</div>
          <div className="plan-price">
            {def.price > 0 ? (
              <>
                $<strong>{def.price}</strong>/mo · billed monthly
              </>
            ) : (
              <>$<strong>0</strong> · free tier</>
            )}
          </div>
        </div>

        <div className="plan-summary">
          {plan === "free" ? (
            <>
              <span className="b">{def.credits} credits</span> a month for score and basic dashboard.
            </>
          ) : (
            <>
              <span className="b">{def.credits.toLocaleString()} credits</span> a month.
              {renewDate && def.price > 0 && (
                <>
                  {" "}
                  Renews <span className="b">{renewDate}</span> for{" "}
                  <span className="b">${def.price.toFixed(2)}</span>.
                </>
              )}
            </>
          )}
        </div>

        <ul className="plan-feats">
          {def.heroFeatures.map((f) => (
            <li key={f}>
              <CheckIcon />
              {f}
            </li>
          ))}
        </ul>

        <div className="plan-cta-row">
          <a href="#plans" className="tb-btn outlined" style={{ borderColor: "var(--border-strong)" }}>
            Change plan
          </a>
        </div>
      </div>

      <div className="hero-card credits">
        <div className="hc-eyebrow">
          <span className={`pin${eyebrowWarn ? " warn" : ""}`} />
          CREDIT BALANCE
          {eyebrowWarn ? " · ON PACE TO RUN OUT" : ""}
        </div>

        <div className="cb-balance">
          <span className="cb-num">{remaining.toLocaleString()}</span>
          <span className="cb-of">/ {stats.totalCredits.toLocaleString()}</span>
        </div>

        <div className="cb-cap">
          <span className="b">{stats.usedCredits.toLocaleString()} used</span>
          {daysLeft != null && (
            <>
              {" "}
              · resets in <span className="b">{daysLeft} days</span>
              {renewDate && <> on {renewDate}</>}
            </>
          )}
        </div>

        <div className="cb-bar-wrap">
          <div className="cb-bar">
            <div className="used" style={{ width: `${Math.min(usedPct, 100)}%` }} />
            {projPct > 0 && (
              <div
                className="proj"
                style={{
                  left: `${Math.min(usedPct, 100)}%`,
                  width: `${Math.min(projPct, 100 - usedPct)}%`,
                }}
              />
            )}
          </div>
          <div className="cb-bar-leg">
            <span className="it">
              <span className="sw used" />
              USED {stats.usedCredits.toLocaleString()}
            </span>
            {projPct > 0 && (
              <span className="it">
                <span className="sw proj" />
                PROJECTED +{Math.round(stats.burnRate7d * (daysLeft ?? 0)).toLocaleString()}
              </span>
            )}
            <span className="it" style={{ marginLeft: "auto" }}>
              <span className="sw free" />
              FREE {remaining.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="cb-burn">
          <div className="stat">
            <div className="v">
              {stats.burnRate7d}{" "}
              <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>/day</span>
            </div>
            <div className="l">Burn rate · 7d</div>
          </div>
          <div className="div" />
          <div className="stat">
            <div className={`v${eyebrowWarn ? " warn" : ""}`}>{depleteDate ?? "—"}</div>
            <div className="l">Likely to deplete</div>
          </div>
          <div className="div" />
          <div className="stat">
            <div className="v">{costPerCredit}</div>
            <div className="l">Cost / credit</div>
          </div>
        </div>
      </div>

      <div className="hero-card invoice">
        <div className="hc-eyebrow">NEXT INVOICE</div>

        <div className="ni-amount-row">
          <span className="ni-amount">
            ${Math.floor(invoiceTotal)}
            <span className="cur">.{String(Math.round((invoiceTotal % 1) * 100)).padStart(2, "0")}</span>
          </span>
        </div>

        <div className="ni-date">
          {hasNextInvoice && renewDate ? (
            <>
              Charges on <span className="b">{renewDate}</span>
            </>
          ) : cancelScheduled ? (
            "Cancelled · no further charges"
          ) : isPaid ? (
            "Renewal date not available yet"
          ) : (
            "Free tier · no upcoming charge"
          )}
        </div>

        <div className="ni-lines">
          <div className="ni-line">
            <span className="b">
              {def.label} · monthly
            </span>
            <span className="v">${def.price.toFixed(2)}</span>
          </div>
          {stats.cycleTopupSpend > 0 ? (
            <div className="ni-line">
              <span>Top-ups this cycle · already charged</span>
              <span className="v">${stats.cycleTopupSpend.toFixed(2)}</span>
            </div>
          ) : null}
        </div>

        <div className="ni-pm">
          {stats.profile.polar_customer_id ? (
            <>
              <span>Payments handled by <span className="b">Polar</span></span>
              <a href="/api/billing/portal" style={{ marginLeft: "auto" }} className="b underline underline-offset-4">
                Manage billing
              </a>
            </>
          ) : (
            <span>Payment details are added at checkout.</span>
          )}
        </div>
      </div>
    </div>
  );
}
