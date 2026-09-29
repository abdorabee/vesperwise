import type { BillingStats } from "@/lib/billing-stats";

interface BillingInvoicesProps {
  stats: BillingStats;
  workspaceLabel: string;
}

export function BillingInvoices({ stats, workspaceLabel }: BillingInvoicesProps) {
  const hasCustomer = !!stats.profile.polar_customer_id;
  const invoices = stats.invoices;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="t">Invoices</div>
          <div className="s">All charges to {workspaceLabel} · paid by Polar</div>
        </div>
      </div>

      {invoices.length > 0 ? (
        <>
          <div className="inv-thead">
            <span>Date</span>
            <span>Description</span>
            <span style={{ textAlign: "right" }}>Amount</span>
            <span>Invoice #</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>&nbsp;</span>
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className="inv-row">
              <span className="date">{inv.date}</span>
              <span>{inv.description}</span>
              <span className="amt" style={{ textAlign: "right" }}>
                ${inv.amount.toFixed(2)}
              </span>
              <span className="num">{inv.invoiceNumber}</span>
              <span className={`pill ${inv.status === "paid" ? "paid" : "pending"}`}>
                <span className="d" />
                {inv.status === "paid" ? "Paid" : inv.status === "refunded" ? "Refunded" : "Pending"}
              </span>
              <span className="actions">
                <a
                  href={inv.portalUrl}
                  className="ic-btn"
                  title="View in Polar"
                  aria-label={`View invoice ${inv.invoiceNumber} in Polar`}
                  style={{ minWidth: 28, minHeight: 28 }}
                >
                  <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
                    <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" />
                    <circle cx="6" cy="6" r="1.5" />
                  </svg>
                </a>
              </span>
            </div>
          ))}
          <div className="inv-foot">
            <span>
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} ·{" "}
              <strong style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                ${stats.invoicesYtdTotal.toFixed(2)}
              </strong>{" "}
              YTD
            </span>
            <a href="/api/billing/portal">View all invoices →</a>
          </div>
        </>
      ) : (
        <div className="panel-body" style={{ color: "var(--text-tertiary)", fontSize: 13, padding: "20px 18px" }}>
          {hasCustomer
            ? "No invoices yet. Charges will appear here after your first payment."
            : "No invoices yet. Subscribe to a plan to start billing."}
        </div>
      )}
    </div>
  );
}
