"use client";

import {
  BILLING_PLANS,
  comparePlans,
  planCreditsUnit,
  type PlanKey,
} from "@/lib/billing-plans";

interface BillingPlansGridProps {
  currentPlan: PlanKey;
}

export function BillingPlansGrid({ currentPlan }: BillingPlansGridProps) {
  return (
    <>
      <div className="section-head" id="plans">
        <div>
          <div className="h">Plans</div>
          <div className="s">Switch any time — unused credits don&apos;t roll over.</div>
        </div>
      </div>

      <div className="plans-grid">
        {BILLING_PLANS.map((p) => {
          const isCurrent = p.key === currentPlan;
          const isRecommended = p.key === "growth" && !isCurrent;
          const rank = comparePlans(p.key, currentPlan);

          return (
            <div
              key={p.key}
              className={`plan-card-c${isCurrent ? " current" : ""}${isRecommended ? " recommended" : ""}`}
            >
              {isCurrent && (
                <div className="pc-current-tag">
                  <span className="d" />
                  CURRENT
                </div>
              )}

              <div className="pc-name">
                <span className="sw" style={{ background: p.color }} />
                {p.label}
              </div>

              <div className="pc-price-row">
                <span className="pc-price">
                  <span className="cur">$</span>
                  {p.price}
                </span>
                <span className="pc-per">{p.price === 0 ? "/ forever" : "/ mo"}</span>
              </div>

              <div className="pc-credits">
                <span className="num">{p.credits.toLocaleString()}</span>
                <span className="lab">credits / mo</span>
                <span className="unit">{planCreditsUnit(p)}</span>
              </div>

              <ul className="pc-feats">
                {p.features.map((f) => (
                  <li key={f} className={isCurrent ? "hi" : undefined}>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="pc-cta current">Current plan</div>
              ) : rank > 0 ? (
                p.key === "agency" ? (
                  <a href="mailto:sales@vesperwise.com" className="pc-cta outline">
                    Talk to sales
                  </a>
                ) : (
                  <form action="/api/billing/checkout" method="POST">
                    <input type="hidden" name="plan" value={p.key} />
                    <button type="submit" className={`pc-cta${isRecommended ? " solid" : " outline"}`}>
                      {`Upgrade to ${p.label}`}
                    </button>
                  </form>
                )
              ) : (
                <a href="/api/billing/portal" className="pc-cta outline">
                  Downgrade
                </a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
