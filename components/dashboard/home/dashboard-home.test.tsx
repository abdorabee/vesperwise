import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computeKpis, creditUsage, dailyBandTrend, recentActivity, type ScoreIndexRow } from "@/lib/dashboard-home";
import DashboardHomeView from "./dashboard-home";

const NOW = Date.parse("2026-09-29T12:00:00Z");

function props(rows: ScoreIndexRow[]) {
  return {
    now: NOW,
    range: "30d" as const,
    kpis: computeKpis(rows, NOW),
    credits: creditUsage(1240, 2000),
    renewsAt: "2026-10-12T00:00:00Z",
    trend: dailyBandTrend(rows, 30, NOW),
    activity: recentActivity(rows, 8),
    hotAccounts: <div data-testid="hot-slot" />,
    firstRun: { hasWatchlist: false, hasBulkJob: false },
  };
}

describe("DashboardHomeView", () => {
  it("shows the first-run hero instead of the grid when nothing is tracked", () => {
    const html = renderToStaticMarkup(<DashboardHomeView {...props([])} />);
    expect(html).toContain("Score your first company");
    expect(html).toContain('name="domain"');
    expect(html).toContain("/score?domain=stripe.com");
    expect(html).toContain('href="/bulk"');
    expect(html).not.toContain("Band trend");
    expect(html).not.toContain("hot-slot");
  });

  it("renders real KPIs, the hot slot and no placeholder content once accounts exist", () => {
    const rows: ScoreIndexRow[] = [
      { id: "1", domain: "stripe.com", company_name: "Stripe", score: 88, score_band: "HOT", created_at: "2026-09-29T11:59:30Z" },
      { id: "2", domain: "ramp.com", company_name: "Ramp", score: 62, score_band: "WARM", created_at: "2026-09-28T10:00:00Z" },
    ];
    const html = renderToStaticMarkup(<DashboardHomeView {...props(rows)} />);
    expect(html).toContain(">Home</h1>");
    expect(html).toContain("HOT now");
    expect(html).toContain("1,240");
    expect(html).toContain("Renews Oct 12");
    expect(html).toContain("hot-slot");
    expect(html).toContain("Trend appears after 3 days of scoring");
    expect(html).toContain(">now</time>");
    expect(html).toContain('href="/dashboard?range=7d"');
    expect(html).not.toMatch(/Coming soon|Autopilot|⋯|>0m</);
  });
});
