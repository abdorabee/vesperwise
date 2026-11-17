"use client";

import { BillingPostForm } from "@/components/billing/billing-post-form";
import {
  BILLING_PLANS,
  planCardAction,
  planCreditsUnit,
  renewalDisclosure,
  type PlanKey,
} from "@/lib/billing-plans";

interface BillingPlansGridProps {
  currentPlan: PlanKey;
  /** Plan was granted (no Polar subscription). Hide upgrade and downgrade. */
  granted?: boolean;
}

export function BillingPlansGrid({ currentPlan, granted = false }: BillingPlansGridProps) {
  return (
    <>
      <div className="section-head" id="plans">
        <div>
          <div className="h">Plans</div>
          <div className="s">{granted ? "Your granted plan" : "Switch any time — unused credits don't roll over."}</div>
        </div>
      </div>

      <div className="plans-grid">
        {BILLING_PLANS.map((p) => {
          const isCurrent = p.key === currentPlan;
          const isRecommended = p.key === "growth" && !isCurrent && !granted;
          const action = planCardAction(currentPlan, p.key, granted);
          if (granted && !isCurrent) return null;

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
                {p.contactOnly ? (
                  <span className="pc-price">{granted && isCurrent ? "Granted" : "Contact us"}</span>
                ) : (
                  <>
                    <span className="pc-price">
                      <span className="cur">$</span>
                      {p.price}
                    </span>
                    <span className="pc-per">{p.price === 0 ? "/ forever" : "/ mo"}</span>
                  </>
                )}
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

              {action === "current" ? (
                <div className="pc-cta current">Current plan</div>
              ) : action === "contact" ? (
                <a href="/contact#contact-form" className="pc-cta outline">
                  Contact us
                </a>
              ) : action === "upgrade" ? (
                <BillingPostForm
                  action="/api/billing/checkout"
                  fieldName="plan"
                  fieldValue={p.key}
                  label={`Upgrade to ${p.label}`}
                  buttonClassName={`pc-cta${isRecommended ? " solid" : " outline"}`}
                  ariaDescribedBy={`renewal-${p.key}`}
                >
                  <p id={`renewal-${p.key}`} className="pc-renewal">
                    {renewalDisclosure(p.price)} <a href="/terms#s3">Terms</a>
                  </p>
                </BillingPostForm>
              ) : action === "downgrade" ? (
                <>
                  <a href="/api/billing/portal" className="pc-cta outline" aria-describedby={`portal-${p.key}`}>
                    Downgrade
                  </a>
                  <p id={`portal-${p.key}`} className="pc-renewal">
                    Opens the secure billing portal.
                  </p>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
