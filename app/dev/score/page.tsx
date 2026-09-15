"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SearchProvider } from "@/components/dashboard/search-provider";
import { getStoredTheme, setStoredTheme } from "@/components/theme-provider";
import { ScoreView } from "@/app/(dashboard)/score/score-view";
import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import { blockFromScoreStage, workspaceFromScore } from "@/lib/gen-ui";
import type { UiBlock } from "@/lib/gen-ui";
import type { SignalResult, SignalSet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function signal(score: number, max: number, detail: string, observed_at: string): SignalResult {
  return {
    score,
    max,
    detail,
    status: "ok",
    observed_at,
    fetched_at: observed_at,
    source: "mock",
  };
}

const HOT_SIGNALS: SignalSet = {
  funding: signal(22, 25, "Series C closed; growth capital for GTM expansion.", "2026-08-12T00:00:00.000Z"),
  hiring: signal(16, 20, "Open AE and solutions roles in APAC.", "2026-08-28T00:00:00.000Z"),
  news: signal(14, 20, "Partnership announcement with a major cloud vendor.", "2026-09-02T00:00:00.000Z"),
  technology: signal(12, 20, "New billing SDK release noted on changelog.", "2026-07-20T00:00:00.000Z"),
  web: signal(68, 100, "Strong domain authority and product pages.", "2026-09-01T00:00:00.000Z"),
  github: signal(40, 100, "Active public SDK repos.", "2026-08-15T00:00:00.000Z"),
  latestSignalDate: "2026-09-02T00:00:00.000Z",
};

const COLD_SIGNALS: SignalSet = {
  funding: signal(2, 25, "No recent funding events in window.", "2025-11-01T00:00:00.000Z"),
  hiring: signal(1, 20, "Sparse hiring signals.", "2026-01-12T00:00:00.000Z"),
  news: signal(3, 20, "Low news volume; no buying triggers.", "2026-02-04T00:00:00.000Z"),
  technology: signal(4, 20, "Stable stack; no material change.", "2026-03-18T00:00:00.000Z"),
  web: signal(35, 100, "Average web footprint.", "2026-08-01T00:00:00.000Z"),
  github: signal(8, 100, "Quiet public activity.", "2026-06-01T00:00:00.000Z"),
  latestSignalDate: "2026-03-18T00:00:00.000Z",
};

const RECENT = [
  {
    domain: "stripe.com",
    company_name: "Stripe",
    score: 84,
    score_band: "HOT" as const,
    created_at: "2026-09-08T14:22:00.000Z",
  },
  {
    domain: "notion.so",
    company_name: "Notion",
    score: 61,
    score_band: "WARM" as const,
    created_at: "2026-09-04T09:10:00.000Z",
  },
  {
    domain: "acme.co",
    company_name: "Acme",
    score: 28,
    score_band: "COLD" as const,
    created_at: "2026-08-19T18:40:00.000Z",
  },
];

type LiveStage = "idle" | "domain" | "signals" | "score" | "action" | "done";

function LiveStagePlayback({ band }: { band: "hot" | "cold" }) {
  const [stage, setStage] = useState<LiveStage>("idle");
  const [artifacts, setArtifacts] = useState<UiBlock[]>([]);
  const [pinned, setPinned] = useState<UiBlock[]>([]);

  const mock = useMemo(() => {
    if (band === "cold") {
      return {
        company: "Acme",
        domain: "acme.co",
        intent_score: 28,
        score_band: "COLD" as const,
        buying_stage: "Research",
        urgency: "nurture",
        data_coverage: 0.62,
        score_status: "partial",
        icp_fit_score: 41,
        recommended_action: "Park in nurture and re-score after the next hiring spike.",
        why_now: "No dated trigger is strong enough to justify a same-week push.",
        email_subject: "Quick note on timing",
        talk_track: "Happy to reconnect when GTM hiring picks up — not pitching today.",
        signals: COLD_SIGNALS,
      };
    }
    return {
      company: "Stripe",
      domain: "stripe.com",
      intent_score: 84,
      score_band: "HOT" as const,
      buying_stage: "Expand",
      urgency: "this week",
      data_coverage: 0.91,
      score_status: "full",
      icp_fit_score: 88,
      recommended_action: "Open with the APAC AE hiring + Series C wedge this week.",
      why_now: "Hiring and funding dates are both inside the 30-day window.",
      email_subject: "Congrats on the round — APAC AE timing",
      talk_track: "Saw the Series C and APAC AE openings — worth a short thread on enablement?",
      signals: HOT_SIGNALS,
    };
  }, [band]);

  useEffect(() => {
    setStage("idle");
    setArtifacts([]);
    setPinned([]);
    let cancelled = false;
    const timers: number[] = [];

    const push = (delay: number, next: LiveStage, block: UiBlock | null, pin = false) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setStage(next);
          if (block) {
            if (pin) setPinned([block]);
            else setArtifacts((prev) => [...prev, block]);
          }
        }, delay),
      );
    };

    push(400, "domain", blockFromScoreStage({ stage: "domain", company: mock.company, domain: mock.domain }));
    push(
      1100,
      "signals",
      blockFromScoreStage({
        stage: "signals",
        company: mock.company,
        domain: mock.domain,
        signals: mock.signals,
      }),
    );
    push(
      1900,
      "score",
      blockFromScoreStage({
        stage: "score",
        company: mock.company,
        domain: mock.domain,
        intent_score: mock.intent_score,
        score_band: mock.score_band,
        buying_stage: mock.buying_stage,
        urgency: mock.urgency,
        data_coverage: mock.data_coverage,
        score_status: mock.score_status,
        icp_fit_score: mock.icp_fit_score,
        signals: mock.signals,
        latest_signal_at: mock.signals.latestSignalDate,
      }),
      true,
    );
    push(
      2700,
      "action",
      blockFromScoreStage({
        stage: "action",
        recommended_action: mock.recommended_action,
        why_now: mock.why_now,
        urgency: mock.urgency,
      }),
    );
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setStage("done");
        setArtifacts((prev) => [
          ...prev,
          ...workspaceFromScore(mock).filter((b) => b.type === "outreach_studio" || b.type === "action_rail"),
        ]);
      }, 3200),
    );

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [mock]);

  const labels: LiveStage[] = ["domain", "signals", "score", "action", "done"];

  return (
    <div className="@container/main flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
        <Card className="gap-3 rounded-xl py-4 shadow-xs">
          <CardHeader className="px-4">
            <CardDescription>Live stage playback</CardDescription>
            <CardTitle className="text-base">
              Mock score stream · {band.toUpperCase()} · no Clerk
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => {
                const idx = labels.indexOf(label);
                const current = labels.indexOf(stage === "idle" ? "domain" : stage);
                return (
                  <span
                    key={label}
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-[11px]",
                      idx < current && "border-foreground/20 bg-card text-foreground",
                      idx === current && stage !== "idle" && "border-foreground/40 bg-card font-medium",
                      idx > current && "border-transparent text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {pinned.length > 0 ? <GenUiWorkspace blocks={pinned} handlers={{}} /> : null}

        {artifacts.length === 0 && stage === "idle" ? (
          <div className="flex min-h-[10rem] items-center justify-center rounded-xl bg-muted/50 p-6 text-sm text-muted-foreground">
            Waiting for domain stage…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <GenUiWorkspace blocks={artifacts} handlers={{}} />
          </div>
        )}
      </div>
    </div>
  );
}

function DevScoreBody() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "empty";
  const band = searchParams.get("band") === "cold" ? "cold" : "hot";

  const resultBlocks = useMemo(() => {
    if (band === "cold") {
      return workspaceFromScore({
        company: "Acme",
        domain: "acme.co",
        intent_score: 28,
        score_band: "COLD",
        buying_stage: "Research",
        urgency: "nurture",
        data_coverage: 0.62,
        score_status: "partial",
        icp_fit_score: 41,
        recommended_action: "Park in nurture and re-score after the next hiring spike.",
        why_now: "No dated trigger is strong enough to justify a same-week push.",
        email_subject: "Quick note on timing",
        talk_track: "Happy to reconnect when GTM hiring picks up — not pitching today.",
        signals: COLD_SIGNALS,
      });
    }
    return workspaceFromScore({
      company: "Stripe",
      domain: "stripe.com",
      intent_score: 84,
      score_band: "HOT",
      buying_stage: "Expand",
      urgency: "this week",
      data_coverage: 0.91,
      score_status: "full",
      icp_fit_score: 88,
      recommended_action: "Open with the APAC AE hiring + Series C wedge this week.",
      why_now: "Hiring and funding dates are both inside the 30-day window.",
      email_subject: "Congrats on the round — APAC AE timing",
      talk_track: "Saw the Series C and APAC AE openings — worth a short thread on enablement?",
      signals: HOT_SIGNALS,
    });
  }, [band]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground lg:px-6">
        <span className="font-medium text-foreground">Pass 2 · Score live artifacts</span>
        <span className="text-border">·</span>
        <Link
          href="/dev/score?view=empty"
          className={cn(
            "rounded-md px-2 py-1 hover:bg-muted",
            view === "empty" && "bg-muted font-medium text-foreground",
          )}
        >
          Empty
        </Link>
        <Link
          href="/dev/score?view=live&band=hot"
          className={cn(
            "rounded-md px-2 py-1 hover:bg-muted",
            view === "live" && band === "hot" && "bg-muted font-medium text-foreground",
          )}
        >
          Live HOT
        </Link>
        <Link
          href="/dev/score?view=live&band=cold"
          className={cn(
            "rounded-md px-2 py-1 hover:bg-muted",
            view === "live" && band === "cold" && "bg-muted font-medium text-foreground",
          )}
        >
          Live COLD
        </Link>
        <Link
          href="/dev/score?view=result&band=hot"
          className={cn(
            "rounded-md px-2 py-1 hover:bg-muted",
            view === "result" && band === "hot" && "bg-muted font-medium text-foreground",
          )}
        >
          Result HOT
        </Link>
        <Link
          href="/dev/score?view=result&band=cold"
          className={cn(
            "rounded-md px-2 py-1 hover:bg-muted",
            view === "result" && band === "cold" && "bg-muted font-medium text-foreground",
          )}
        >
          Result COLD
        </Link>
        <Button type="button" variant="ghost" size="xs" className="ml-auto rounded-lg" asChild>
          <Link href="/dev/shell">Shell only</Link>
        </Button>
      </div>

      {view === "live" ? (
        <LiveStagePlayback band={band} />
      ) : view === "result" ? (
        <div className="@container/main flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <GenUiWorkspace blocks={resultBlocks} handlers={{}} />
            </div>
            <div className="mx-auto w-full max-w-5xl rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              Static result document — use Live HOT/COLD for stage-by-stage artifacts (compact next-action only).
            </div>
          </div>
        </div>
      ) : (
        <ScoreView creditsRemaining={42} recentScores={RECENT} />
      )}
    </div>
  );
}

/**
 * Public no-auth mock of Pass 2 Score (empty + live stages + result) inside Pass 1 Blocks chrome.
 * Forces light theme while mounted for Blocks comparison.
 */
export default function DevScorePage() {
  useEffect(() => {
    const previous = getStoredTheme();
    setStoredTheme("light");
    return () => setStoredTheme(previous);
  }, []);

  if (process.env.VERCEL_ENV === "production") {
    return null;
  }

  return (
    <SearchProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          creditsRemaining={42}
          plan="growth"
          workspaceName="Preview Workspace"
          inboxCount={3}
          watchlistCount={8}
          pipelineHotCount={2}
        />
        <SidebarInset className="overflow-hidden">
          <SiteHeader />
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading Score preview…
              </div>
            }
          >
            <DevScoreBody />
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </SearchProvider>
  );
}
