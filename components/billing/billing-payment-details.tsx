import type { BillingStats } from "@/lib/billing-stats";

interface BillingPaymentDetailsProps {
  stats: BillingStats;
  email: string;
  workspaceLabel: string;
}

export function BillingPaymentDetails({ stats, email, workspaceLabel }: BillingPaymentDetailsProps) {
  const hasCustomer = !!stats.profile.polar_customer_id;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="t">Payment &amp; billing details</div>
          <div className="s">Charged in USD · payments handled by Polar</div>
        </div>
      </div>
      <div className="pm-list">
        {hasCustomer ? (
          <div className="pm-row">
            <div className="pm-info">
              <div className="l1">Card, address and tax details</div>
              <div className="l2">Stored and managed securely in the Polar customer portal</div>
            </div>
            <a href="/api/billing/portal" className="pm-edit">
              Manage
            </a>
          </div>
        ) : (
          <div className="pm-row">
            <div className="pm-info">
              <div className="l1">No payment method yet</div>
              <div className="l2">You add one at checkout when you pick a plan or buy credits.</div>
            </div>
            <a href="#plans" className="pm-edit">
              See plans
            </a>
          </div>
        )}
      </div>
      <div className="billto">
        <div className="it">
          <div className="l">BILL TO</div>
          <div className="v">{workspaceLabel}</div>
        </div>
        <div className="it">
          <div className="l">BILLING EMAIL</div>
          <div className="v mono">{email || "—"}</div>
        </div>
      </div>
    </div>
  );
}
