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
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  ScoreStageToolRow,
  SCORE_STAGE_ORDER,
  SCORE_STAGE_TITLES,
  nextScoreStage,
  type ScoreStageKey,
  type ScoreStageToolState,
} from "@/components/score/score-stage-tool";
import { blockFromScoreStage, workspaceFromScore } from "@/lib/gen-ui";
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

function upsertTool(
  tools: ScoreStageToolState[],
  stage: ScoreStageKey,
  patch: Partial<ScoreStageToolState> & Pick<ScoreStageToolState, "status">,
): ScoreStageToolState[] {
  const idx = tools.findIndex((t) => t.stage === stage);
  const next: ScoreStageToolState = {
    stage,
    status: patch.status,
    input: patch.input,
    block: patch.block,
    open: patch.open ?? true,
  };
  if (idx >= 0) {
    const copy = [...tools];
    copy[idx] = {
      ...copy[idx],
      ...next,
      input: patch.input ?? copy[idx].input,
      block: patch.block === undefined ? copy[idx].block : patch.block,
    };
    return copy;
  }
  return [...tools, next];
}

function LiveStagePlayback({ band }: { band: "hot" | "cold" }) {
  return <LiveStagePlaybackInner key={band} band={band} />;
}

function LiveStagePlaybackInner({ band }: { band: "hot" | "cold" }) {
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

  const [thinking, setThinking] = useState(true);
  const [detail, setDetail] = useState("Resolve domain…");
  const [tools, setTools] = useState<ScoreStageToolState[]>(() => [
    {
      stage: "domain",
      status: "running",
      input: { domain: mock.domain },
      open: true,
    },
  ]);
  const [extras, setExtras] = useState<ReturnType<typeof workspaceFromScore>>([]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    const complete = (
      delay: number,
      stage: ScoreStageKey,
      block: ReturnType<typeof blockFromScoreStage>,
      input: Record<string, unknown>,
    ) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setTools((prev) => {
            let next = upsertTool(prev, stage, { status: "done", block, input, open: true });
            const upcoming = nextScoreStage(stage);
            if (upcoming) {
              next = upsertTool(next, upcoming, {
                status: "running",
                input: { domain: mock.domain },
                open: true,
              });
            }
            return next;
          });
          const upcoming = nextScoreStage(stage);
          setDetail(upcoming ? `${SCORE_STAGE_TITLES[upcoming]}…` : "Finishing…");
        }, delay),
      );
    };

    complete(
      500,
      "domain",
      blockFromScoreStage({ stage: "domain", company: mock.company, domain: mock.domain }),
      { company: mock.company, domain: mock.domain },
    );
    complete(
      1300,
      "signals",
      blockFromScoreStage({
        stage: "signals",
        company: mock.company,
        domain: mock.domain,
        signals: mock.signals,
      }),
      {
        domain: mock.domain,
        axes: ["funding", "hiring", "news", "technology", "web", "github"],
      },
    );
    complete(
      2200,
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
      {
        domain: mock.domain,
        intent_score: mock.intent_score,
        score_band: mock.score_band,
      },
    );
    complete(
      3000,
      "action",
      blockFromScoreStage({
        stage: "action",
        recommended_action: mock.recommended_action,
        why_now: mock.why_now,
        urgency: mock.urgency,
      }),
      { urgency: mock.urgency, has_action: true },
    );

    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setThinking(false);
        setDetail("Scored · demo (no credit)");
        setExtras(
          workspaceFromScore(mock).filter((b) => b.type === "outreach_studio" || b.type === "action_rail"),
        );
      }, 3600),
    );

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [mock]);

  return (
    <div className="@container/main flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 md:gap-4 md:py-6 lg:px-6">
        <Card className="gap-3 rounded-xl py-4 shadow-xs">
          <CardHeader className="px-4">
            <CardDescription>AICSS mid-convo live playback</CardDescription>
            <CardTitle className="text-base">
              Thinking + tool stages · {band.toUpperCase()} · no Clerk
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex flex-wrap gap-1.5">
              {SCORE_STAGE_ORDER.map((label) => {
                const tool = tools.find((t) => t.stage === label);
                return (
                  <span
                    key={label}
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-[11px]",
                      tool?.status === "done" && "border-foreground/20 bg-card text-foreground",
                      tool?.status === "running" && "border-foreground/40 bg-card font-medium",
                      !tool && "border-transparent text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Message from="user">
          <MessageContent className="rounded-xl bg-foreground px-3 py-2 text-sm text-background">
            {mock.domain}
          </MessageContent>
        </Message>

        <Message from="assistant">
          <Reasoning isStreaming={thinking} className="mb-0 w-full">
            <ReasoningTrigger />
            <ReasoningContent>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed">{detail}</div>
            </ReasoningContent>
          </Reasoning>
        </Message>

        {tools.map((tool) => (
          <Message key={`${tool.stage}-${tool.status}`} from="assistant">
            <ScoreStageToolRow tool={tool} handlers={{}} />
          </Message>
        ))}

        {extras.length > 0 ? (
          <Message from="assistant">
            <MessageContent className="flex w-full flex-col gap-3">
              <GenUiWorkspace blocks={extras} handlers={{}} />
            </MessageContent>
          </Message>
        ) : null}
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
        <span className="font-medium text-foreground">Pass 2 · AICSS Score mid-convo</span>
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
              Static result document — use Live HOT/COLD for Thinking + expandable tool stages (no AI thesis).
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
 * Public no-auth mock of Pass 2 Score (empty + AICSS live stages + result) inside Pass 1 Blocks chrome.
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
