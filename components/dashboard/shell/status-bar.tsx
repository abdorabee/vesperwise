"use client";

import Link from "next/link";
import { useDashboardSearch } from "@/components/dashboard/search-provider";
import { ThinkingOrb } from "@/components/score/thinking-orb";
import { useShellStatusValue } from "@/components/dashboard/shell/shell-status";
import { PLAN_CREDITS, type DbUser } from "@/lib/types";
import { getCreditStatus } from "@/lib/credits-status";

interface StatusBarProps {
  creditsRemaining: number;
  plan: DbUser["plan"];
  isMockSignals?: boolean;
}

export function StatusBar({ creditsRemaining, plan, isMockSignals = false }: StatusBarProps) {
  const { open: openSearch } = useDashboardSearch();
  const pageStatus = useShellStatusValue();
  const creditCap = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
  const status = getCreditStatus({ creditsRemaining, creditCap, plan });

  return (
    <div data-slot="dashboard-status-bar" className="dashboard-status-bar">
      <div className="dashboard-status-bar__left">
        {pageStatus ? (
          <span data-slot="statusbar-page-status" className="dashboard-status-bar__page-status">
            {pageStatus.busy ? <ThinkingOrb label={pageStatus.text} size={10} /> : null}
            <span className="truncate">{pageStatus.text}</span>
          </span>
        ) : null}
        <Link
          href="/billing"
          data-slot="statusbar-credits"
          className="dashboard-status-bar__link dashboard-status-bar__credits"
          aria-label={status.summary}
        >
          {creditsRemaining.toLocaleString()} credits
        </Link>
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
        <span data-slot="statusbar-plan" className="dashboard-status-bar__pill">
          {status.planLabel}
        </span>
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
        ⌘K Search
      </button>
    </div>
  );
}
