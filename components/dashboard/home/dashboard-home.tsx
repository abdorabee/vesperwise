import type { ReactNode } from "react";

import { PageHeader } from "@/components/app-ui/page-primitives";
import type { ActivityEvent, BandTrend as BandTrendData, CreditUsage, HomeKpis, RangeKey } from "@/lib/dashboard-home";
import { ActivityFeed } from "./activity-feed";
import { BandTrend } from "./band-trend";
import { FirstRun } from "./first-run";
import { RangeToggle, ScoreCompanyButton } from "./home-ui";
import { KpiRow } from "./kpi-row";

const RANGE_LABEL: Record<RangeKey, string> = { "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days" };

export interface DashboardHomeViewProps {
  now: number;
  range: RangeKey;
  kpis: HomeKpis;
  credits: CreditUsage;
  renewsAt: string | null;
  trend: BandTrendData;
  activity: ActivityEvent[];
  /** The hot-accounts card, streamed separately because it needs a second query. */
  hotAccounts: ReactNode;
  firstRun: { hasWatchlist: boolean; hasBulkJob: boolean };
}

function subtitle(kpis: HomeKpis): string {
  const tracked = `${kpis.tracked.toLocaleString("en-US")} account${kpis.tracked === 1 ? "" : "s"} tracked`;
  if (kpis.newHot7d > 0) return `${tracked} · ${kpis.newHot7d} turned HOT this week`;
  return `${tracked} · ${kpis.hotNow} HOT right now`;
}

export default function DashboardHomeView({
  now,
  range,
  kpis,
  credits,
  renewsAt,
  trend,
  activity,
  hotAccounts,
  firstRun,
}: DashboardHomeViewProps) {
  if (kpis.tracked === 0) {
    return (
      <div className="@container/home flex flex-col gap-6">
        <PageHeader
          title="Home"
          description="Who to call today, ranked by purchase intent."
          actions={<ScoreCompanyButton />}
        />
        <FirstRun {...firstRun} />
      </div>
    );
  }

  return (
    <div className="@container/home flex flex-col gap-6">
      <PageHeader
        title="Home"
        description={subtitle(kpis)}
        actions={
          <>
            <RangeToggle value={range} />
            <ScoreCompanyButton />
          </>
        }
      />

      <KpiRow kpis={kpis} credits={credits} renewsAt={renewsAt} />

      <div className="grid items-start gap-4 @5xl/home:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {hotAccounts}
        <ActivityFeed events={activity} rangeLabel={RANGE_LABEL[range]} now={now} />
      </div>

      <BandTrend days={trend.days} activeDays={trend.activeDays} current={kpis.bands} rangeLabel={RANGE_LABEL[range]} />
    </div>
  );
}
