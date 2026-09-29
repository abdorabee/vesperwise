"use client";

import { formatRenewDate } from "@/lib/billing-stats";
import VesperWiseLogo from "@/components/vesperwise-logo";

interface BillingPageHeadProps {
  renewAt: string | null;
  workspaceLabel: string;
  /** Polar customer exists, so the hosted customer portal can open. */
  hasPortal: boolean;
  cancelScheduled: boolean;
  onTopUp: () => void;
}

export function BillingPageHead({ renewAt, workspaceLabel, hasPortal, cancelScheduled, onTopUp }: BillingPageHeadProps) {
  const renewDate = formatRenewDate(renewAt);

  return (
    <div className="bill-head">
      <div>
        <div className="title-row">
          <div className="title">Billing &amp; credits</div>
          <span className="ws-pill">
            <VesperWiseLogo className="lg" size={16} />
            {workspaceLabel} · USD
          </span>
        </div>
        <div className="sub">
          Your plan, credits and invoices ·{" "}
          <span>
            {renewDate ? (
              <>
                {cancelScheduled ? "Plan ends" : "Renews"}{" "}
                <strong style={{ color: "var(--text-primary)", fontWeight: 500 }}>{renewDate}</strong>
              </>
            ) : (
              "No upcoming charge"
            )}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {hasPortal ? (
          <a href="/api/billing/portal" className="tb-btn outlined">
            Manage billing
          </a>
        ) : null}
        <button type="button" className="btn-primary" onClick={onTopUp}>
          <svg className="ic" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 2v8M2 6h8" />
          </svg>
          Top up credits
        </button>
      </div>
    </div>
  );
}
