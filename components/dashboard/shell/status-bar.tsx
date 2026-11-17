"use client";

import Link from "next/link";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import { ThinkingOrb } from "@/components/score/thinking-orb";
import { useShellStatusValue } from "@/components/dashboard/shell/shell-status";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getCreditStatus } from "@/lib/credits-status";
import { shortcutLabel, useModKey } from "@/lib/use-mod-key";

interface StatusBarProps {
  creditsRemaining: number;
  plan: DbUser["plan"];
  polarSubscriptionId?: string | null;
  isMockSignals?: boolean;
}

export function StatusBar({ creditsRemaining, plan, polarSubscriptionId, isMockSignals = false }: StatusBarProps) {
  const { open: openSearch } = useDashboardSearch();
  const modKey = useModKey();
  const pageStatus = useShellStatusValue();
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const status = getCreditStatus({ creditsRemaining, creditCap, plan, polarSubscriptionId });

  return (
    <div data-slot="dashboard-status-bar" className="dashboard-status-bar">
      <div className="dashboard-status-bar__left">
        {pageStatus ? (
          <span data-slot="statusbar-page-status" className="dashboard-status-bar__page-status">
            {pageStatus.busy ? <ThinkingOrb label={pageStatus.text} size={10} /> : null}
            <span className="truncate">{pageStatus.text}</span>
          </span>
        ) : null}
        {status.isLow ? (
          <>
            <span data-slot="statusbar-credit-warning" className="dashboard-status-bar__warning">
              Low credits
            </span>
            <Link href="/billing" className="dashboard-status-bar__link">
              {status.cta}
            </Link>
          </>
        ) : null}
        {isMockSignals ? (
          <span data-slot="statusbar-mock-signals" className="dashboard-status-bar__pill">
            Mock signals
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="dashboard-status-bar__search"
        aria-label="Open search"
        onClick={openSearch}
      >
        <span className="kbd-hint">{shortcutLabel(modKey, "K")} </span>Search
      </button>
    </div>
  );
}
