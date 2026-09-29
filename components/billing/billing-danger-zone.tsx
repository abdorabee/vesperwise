import type { PlanKey } from "@/lib/billing-plans";
import { formatRenewDate } from "@/lib/billing-stats";

interface BillingDangerZoneProps {
  currentPlan: PlanKey;
  isPaid: boolean;
  cancelScheduled: boolean;
  renewsAt?: string | null;
}

export function BillingDangerZone({
  isPaid,
  cancelScheduled,
  renewsAt,
}: BillingDangerZoneProps) {
  const renewDate = formatRenewDate(renewsAt ?? null);

  if (!isPaid) {
    return (
      <div className="danger">
        <div className="danger-row">
          <div>
            <div className="l">Free plan</div>
            <div className="h">Upgrade anytime from the plans section above.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="danger">
      <div className="danger-row">
        <div>
          <div className="l">Cancel subscription</div>
          <div className="h">
            {cancelScheduled
              ? "Cancellation scheduled — you'll keep access until the period ends."
              : renewDate
                ? `Cancel in the Polar portal. You keep your plan until ${renewDate}, then move to Free. Your scores and lists stay.`
                : "Cancel in the Polar portal. You keep your plan until the period ends, then move to Free. Your scores and lists stay."}
          </div>
        </div>
        {cancelScheduled ? (
          <a href="/api/billing/portal" className="tb-btn outlined">
            Resume plan
          </a>
        ) : (
          <a href="/api/billing/portal" className="btn-danger">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
            Cancel plan
          </a>
        )}
      </div>
    </div>
  );
}
