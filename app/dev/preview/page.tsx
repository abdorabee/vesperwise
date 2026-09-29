"use client";

import { use } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
import DashboardHomeView from "@/components/dashboard/home/dashboard-home";
import { HotAccounts, type HotAccountRow } from "@/components/dashboard/home/hot-accounts";
import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import { ScoreResearchStatus } from "@/components/score/score-research-status";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { UiBlock } from "@/lib/gen-ui";
import {
  computeKpis,
  creditUsage,
  dailyBandTrend,
  pickHotAccounts,
  recentActivity,
  type ScoreIndexRow,
} from "@/lib/dashboard-home";

/**
 * Preview-only (dev/preview deployments; auth-gated in production via lib/route-access.ts).
 * Renders the signed-in screens with fictional sample accounts so they can be reviewed without a login.
 * /dev/preview?view=home | score | research | first-run
 */

const NOW = Date.parse("2026-09-29T12:00:00Z");
const DAY = 86_400_000;

const ACCOUNTS: Array<[string, string, number[]]> = [
  // domain, company, score history (oldest → newest)
  ["northwind.io", "Northwind", [61, 72, 88]],
  ["acmerobotics.com", "Acme Robotics", [70, 84]],
  ["lumenpay.com", "LumenPay", [66, 79]],
  ["corvid.dev", "Corvid", [58, 77]],
  ["tallyhq.com", "Tally HQ", [81, 76]],
  ["brightline.ai", "Brightline", [44, 63]],
  ["quarry.app", "Quarry", [55, 58]],
  ["fernwood.co", "Fernwood", [49, 52]],
  ["orbitlabs.io", "Orbit Labs", [38, 41]],
  ["helix.so", "Helix", [30, 34]],
  ["parcel.run", "Parcel", [25]],
  ["mosaicdata.com", "Mosaic Data", [47]],
];

function band(score: number) {
  return score >= 75 ? "HOT" : score >= 50 ? "WARM" : "COLD";
}

const ROWS: ScoreIndexRow[] = ACCOUNTS.flatMap(([domain, company, history], a) =>
  history.map((score, i) => ({
    id: `${a}-${i}`,
    domain,
    company_name: company,
    score,
    score_band: band(score) as ScoreIndexRow["score_band"],
    created_at: new Date(NOW - (history.length - 1 - i) * 6 * DAY - a * 0.37 * DAY).toISOString(),
  })),
);

const CHIPS: Record<string, [string[], string]> = {
  "northwind.io": [["Series B · 12 d", "+6 RevOps roles"], "Raised a Series B and is hiring RevOps while replacing its CRM."],
  "acmerobotics.com": [["Series B · 42 d", "Salesforce → HubSpot"], "Budget and migration pain are live at the same time."],
  "lumenpay.com": [["New CFO · 9 d", "+4 finance roles"], "New finance leadership is rebuilding the stack."],
  "corvid.dev": [["+11 eng roles", "Launch · 5 d"], "Scaling engineering after a product launch."],
  "tallyhq.com": [["Series A · 70 d"], "Still HOT, but the funding signal is aging."],
  "brightline.ai": [["+3 sales roles"], "Rising fast on new sales hiring."],
};

const HOT_ROWS: HotAccountRow[] = pickHotAccounts(ROWS).map((row) => ({
  ...row,
  chips: CHIPS[row.domain]?.[0] ?? [],
  reason: CHIPS[row.domain]?.[1] ?? null,
}));

const SCORE_BLOCKS: UiBlock[] = [
  {
    type: "intent_hero",
    company: "Acme Robotics",
    domain: "acmerobotics.com",
    intent_score: 84,
    score_band: "HOT",
    data_coverage: 1,
    score_status: "complete",
    urgency: "this-week",
    buying_stage: "decision",
    icp_fit_score: 81,
    last_updated: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    type: "signal_explorer",
    axes: [
      { key: "funding", label: "Funding", score: 21, max: 25, detail: "Closed a $22M Series B led by Northzone.", observed_at: "2026-08-18", source: "explorium-events", source_url: "https://example.com/acme-series-b", contribution: 21 },
      { key: "hiring", label: "Hiring", score: 17, max: 20, detail: "6 open Sales and RevOps roles, including VP RevOps.", observed_at: "2026-09-19", source: "scrapling", source_url: "https://example.com/acme-careers", contribution: 17 },
      { key: "technology", label: "Technology", score: 15, max: 20, detail: "Moved from Salesforce to HubSpot in the last quarter.", observed_at: "2026-08-30", source: "builtwith", contribution: 15 },
      { key: "news", label: "News", score: 12, max: 20, detail: "New CEO announced alongside a product launch.", observed_at: "2026-08-22", source: "gnews", source_url: "https://example.com/acme-news", contribution: 12 },
      { key: "web", label: "Web authority", score: 9, max: 15, detail: "Strong domain authority.", source: "open-page-rank", context: true },
      { key: "github", label: "GitHub activity", score: 4, max: 10, detail: "Active public repositories.", source: "github", context: true },
    ],
  },
  {
    type: "thesis",
    summary: "Acme Robotics is in an active buying window.",
    why_now: "Closed a $22M Series B six weeks ago and is hiring 6 RevOps roles while migrating CRM, so budget and pain are both live right now.",
    recommended_action: "Reach the new VP RevOps this week with a CRM-migration angle.",
  },
  { type: "action_rail", company: "Acme Robotics", domain: "acmerobotics.com" },
];

function Shell({ children, title }: { children: React.ReactNode; title?: string }) {
  void title;
  return (
    <SearchProvider>
      <SidebarProvider className="bg-background">
        <AppSidebar creditsRemaining={1240} plan="growth" workspaceName="Acme Sales" watchlistCount={8} pipelineHotCount={HOT_ROWS.filter((r) => r.band === "HOT").length} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  );
}

export default function DevPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "home" } = use(searchParams);

  if (view === "score" || view === "research") {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-4xl">
          {view === "score" ? (
            <GenUiWorkspace blocks={SCORE_BLOCKS} handlers={{ onPrompt: () => {} }} fresh />
          ) : (
            <ScoreResearchStatus
              progress={{
                reasoning: "idle",
                signals: {
                  funding: { status: "ok", detail: "Series B · $22M", observed_at: "2026-08-18", source: "explorium-events" },
                  hiring: { status: "ok", detail: "6 Sales/RevOps roles", observed_at: "2026-09-19", source: "scrapling" },
                },
              }}
            />
          )}
        </div>
      </Shell>
    );
  }

  const rows = view === "first-run" ? [] : ROWS;
  return (
    <Shell>
      <DashboardHomeView
        now={NOW}
        range="30d"
        kpis={computeKpis(rows, NOW)}
        credits={creditUsage(1240, 2000)}
        renewsAt="2026-10-12T00:00:00Z"
        trend={dailyBandTrend(rows, 30, NOW)}
        activity={recentActivity(rows, 8)}
        hotAccounts={<HotAccounts rows={HOT_ROWS} />}
        firstRun={{ hasWatchlist: false, hasBulkJob: false }}
      />
    </Shell>
  );
}
