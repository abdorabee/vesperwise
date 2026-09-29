"use client";

import { BILLING_TOPUPS } from "@/lib/billing-plans";
import type { BillingStats } from "@/lib/billing-stats";
import { getPlanDef, type PlanKey } from "@/lib/billing-plans";

interface BillingHelpRowProps {
  stats: BillingStats;
  onScrollToTopup: () => void;
  onComparePlans: () => void;
}

export function BillingHelpRow({ stats, onScrollToTopup, onComparePlans }: BillingHelpRowProps) {
  if (!stats.depletesBeforeRenewal && stats.burnRate7d <= 0) return null;

  const plan = (stats.profile.plan ?? "free") as PlanKey;
  const def = getPlanDef(plan);
  const bestTopup = BILLING_TOPUPS.find((t) => t.bestValue) ?? BILLING_TOPUPS[1];
  const nextPlan = ["free", "starter", "growth", "pro", "agency"].find(
    (p) => getPlanDef(p as PlanKey).credits > def.credits,
  );
  const nextDef = nextPlan ? getPlanDef(nextPlan as PlanKey) : null;
  const headroom =
    nextDef && def.credits > 0
      ? `${(nextDef.credits / def.credits).toFixed(1)}× the headroom`
      : "more headroom";

  const standardTopupCost = (bestTopup.credits * (BILLING_TOPUPS[0].price / BILLING_TOPUPS[0].credits)).toFixed(0);

  return (
    <div className="help-row">
      <div className="ic">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
          <path d="M7 1l6 11H1L7 1z M7 5v4M7 11v.5" />
        </svg>
      </div>
      <div className="txt">
        {stats.depletesBeforeRenewal ? (
          <>
            <strong>You&apos;ll likely run out of credits before your next reset.</strong> Top up{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {bestTopup.credits} credits
            </strong>{" "}
            for{" "}
            <strong style={{ color: "var(--text-primary)" }}>${bestTopup.price}</strong>
            {Number(standardTopupCost) > bestTopup.price && (
              <> (vs ${standardTopupCost} at standard rate)</>
            )}
            {nextDef && (
              <>
                , or move to {nextDef.label} for{" "}
                <strong style={{ color: "var(--text-primary)" }}>{headroom}</strong>.
              </>
            )}
          </>
        ) : (
          <>
            <strong>Credits are being used steadily.</strong> Monitor burn rate or top up before
            heavy scoring runs.
          </>
        )}
      </div>
      <button
        type="button"
        className="tb-btn outlined"
        style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
        onClick={onScrollToTopup}
      >
        Top up {bestTopup.credits}
      </button>
      <button
        type="button"
        className="tb-btn"
        style={{ color: "var(--brand-ink)" }}
        onClick={onComparePlans}
      >
        Compare plans →
      </button>
    </div>
  );
}
