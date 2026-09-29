import Link from "next/link";

import { MetricCard } from "@/components/app-ui/page-primitives";
import { cn } from "@/lib/utils";
import type { CreditUsage, HomeKpis } from "@/lib/dashboard-home";
import { Delta } from "./home-ui";

const numberFormat = new Intl.NumberFormat("en-US");

function renewalLabel(renewsAt: string | null): string | null {
  if (!renewsAt) return null;
  const date = new Date(renewsAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Renews ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export function KpiRow({
  kpis,
  credits,
  renewsAt,
}: {
  kpis: HomeKpis;
  credits: CreditUsage;
  renewsAt: string | null;
}) {
  const { prior } = kpis;
  const renewal = renewalLabel(renewsAt);

  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 @5xl/home:grid-cols-4">
      <MetricCard
        label="HOT now"
        value={numberFormat.format(kpis.hotNow)}
        detail={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {prior ? <Delta value={kpis.hotNow - prior.hotNow} /> : null}
            <span>of {numberFormat.format(kpis.tracked)} tracked</span>
          </span>
        }
      />
      <MetricCard
        label="New HOT · last 7 days"
        value={numberFormat.format(kpis.newHot7d)}
        detail={
          prior?.newHot7d != null ? (
            <Delta value={kpis.newHot7d - prior.newHot7d} />
          ) : (
            <span>Accounts that crossed 75 this week</span>
          )
        }
      />
      <MetricCard
        label="Avg HOT score"
        value={kpis.avgHot != null ? kpis.avgHot.toFixed(1) : "—"}
        detail={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {prior?.avgHot != null && kpis.avgHot != null ? <Delta value={kpis.avgHot - prior.avgHot} digits={1} /> : null}
            <span>{kpis.avgHot != null ? "Latest score per account" : "No HOT accounts yet"}</span>
          </span>
        }
      />
      <MetricCard
        label="Credits"
        value={
          <span>
            {numberFormat.format(credits.remaining)}
            <span className="text-base font-medium text-muted-foreground"> / {numberFormat.format(credits.cap)}</span>
          </span>
        }
        detail={
          <div className="flex flex-col gap-2">
            <div
              role="meter"
              aria-label="Credits remaining"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={credits.remainingPct}
              className="h-1 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn("h-full rounded-full", credits.low ? "bg-[var(--warning)]" : "bg-foreground")}
                style={{ width: `${credits.remainingPct}%` }}
              />
            </div>
            <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="tabular-nums">
                {credits.remainingPct}% left{renewal ? ` · ${renewal}` : ""}
              </span>
              <Link
                href="/billing"
                className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                Top up
              </Link>
            </span>
          </div>
        }
      />
    </section>
  );
}
