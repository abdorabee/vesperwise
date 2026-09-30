"use client";

import { useCallback } from "react";
import type { BillingStats } from "@/lib/billing-stats";
import type { PlanKey } from "@/lib/billing-plans";
import { BillingNotification } from "./billing-notification";
import { BillingPageHead } from "@/components/billing/billing-page-head";
import { BillingHero } from "@/components/billing/billing-hero";
import { BillingHelpRow } from "@/components/billing/billing-help-row";
import { BillingPlansGrid } from "@/components/billing/billing-plans-grid";
import { BillingTopupsPanel } from "@/components/billing/billing-topups-panel";
import { BillingCostBreakdown } from "@/components/billing/billing-cost-breakdown";
import { BillingUsageChart } from "@/components/billing/billing-usage-chart";
import { BillingLedger } from "@/components/billing/billing-ledger";
import { BillingPaymentDetails } from "@/components/billing/billing-payment-details";
import { BillingInvoices } from "@/components/billing/billing-invoices";
import { BillingDangerZone } from "@/components/billing/billing-danger-zone";

interface BillingViewProps {
  stats: BillingStats;
  email: string;
  workspaceLabel: string;
}

export function BillingView({ stats, email, workspaceLabel }: BillingViewProps) {
  const plan = (stats.profile.plan ?? "free") as PlanKey;
  const isPaid = plan !== "free" && !!stats.profile.polar_subscription_id;

  const scrollToTopup = useCallback(() => {
    document.getElementById("topups")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToPlans = useCallback(() => {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="billing-page">
      <BillingNotification />
      <div className="bill-shell">
        <div className="bill-content">
          <div className="bill-inner">
            <BillingPageHead
              renewAt={stats.profile.subscription_renews_at}
              workspaceLabel={workspaceLabel}
              hasPortal={!!stats.profile.polar_customer_id}
              cancelScheduled={stats.profile.subscription_cancel_at_period_end ?? false}
              onTopUp={scrollToTopup}
            />

            <BillingHero stats={stats} />

            <BillingHelpRow
              stats={stats}
              onScrollToTopup={scrollToTopup}
              onComparePlans={scrollToPlans}
            />

            <BillingPlansGrid currentPlan={plan} />

            <div className="split-row">
              <BillingTopupsPanel plan={plan} />
              <BillingCostBreakdown stats={stats} />
            </div>

            <BillingUsageChart stats={stats} />
            <BillingLedger stats={stats} />

            <div className="bot-row">
              <BillingPaymentDetails stats={stats} email={email} workspaceLabel={workspaceLabel} />
              <BillingInvoices stats={stats} workspaceLabel={workspaceLabel} />
            </div>

            <BillingDangerZone
              currentPlan={plan}
              isPaid={isPaid}
              cancelScheduled={stats.profile.subscription_cancel_at_period_end ?? false}
              renewsAt={stats.profile.subscription_renews_at}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
