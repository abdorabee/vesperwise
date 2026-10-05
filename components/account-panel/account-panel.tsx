"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ShellPanel } from "@/components/dashboard/shell/shell-panel";
import { buildScoreReport, ScoreReportPanel, type ReportExtraTab } from "@/components/score/score-report-panel";
import type { GenUiHandlers } from "@/components/score/gen-ui/workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountReport, type AccountReportState } from "@/components/account-panel/use-account-report";

interface AccountPanelProps {
  domain: string;
  onClose: () => void;
  /** Page-specific tab shown first, e.g. Pipeline stage controls or a History run snapshot. */
  extraTab?: ReportExtraTab;
}

export function scoreHref(domain: string, view?: "last") {
  const base = `/score?domain=${encodeURIComponent(domain)}`;
  return view ? `${base}&view=${view}` : base;
}

function AccountStateBody({ state, domain, onRetry }: { state: Exclude<AccountReportState, { status: "ready" }>; domain: string; onRetry: () => void }) {
  if (state.status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={`Loading ${domain}`}>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }
  if (state.status === "missing") {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-border p-4 text-sm">
        <p className="font-medium text-foreground">No score yet for {domain}</p>
        <p className="text-muted-foreground">Score it to see intent signals, why now and a recommended next move.</p>
        <Button asChild size="sm"><Link href={scoreHref(domain)}>Score it · 1 credit</Link></Button>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border border-border p-4 text-sm" role="alert">
      <p className="text-destructive">{state.message}</p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </div>
  );
}

/** Header + body used while there is no report to show (loading, missing, error). */
function AccountStatePanel({ domain, state, onClose, onRetry, extraTab }: { domain: string; state: Exclude<AccountReportState, { status: "ready" }>; onClose: () => void; onRetry: () => void; extraTab?: ReportExtraTab }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-start gap-3 border-b border-border/70 px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{domain}</h2>
        <Button type="button" variant="ghost" size="icon-xs" aria-label="Close account panel" onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <AccountStateBody state={state} domain={domain} onRetry={onRetry} />
        {extraTab ? (
          <section aria-label={extraTab.label} className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{extraTab.label}</p>
            {extraTab.content}
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Shared right-hand account panel: the latest stored report for a domain, opened from any page. */
export function AccountPanel({ domain, onClose, extraTab }: AccountPanelProps) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [watchlistByDomain, setWatchlistByDomain] = useState<Record<string, "adding" | "added">>({});
  const state = useAccountReport(domain, reloadKey);

  const report = useMemo(() => (
    state.status === "ready"
      ? buildScoreReport(`account:${domain}`, state.blocks, { current: false, restored: true, stored: state.stored })
      : null
  ), [domain, state]);

  async function addToWatchlist(company: string, target: string) {
    setWatchlistByDomain((current) => ({ ...current, [target]: "adding" }));
    try {
      const response = await fetch("/api/dashboard/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: target, company_name: company }),
      });
      if (!response.ok) throw new Error("Failed to add");
      setWatchlistByDomain((current) => ({ ...current, [target]: "added" }));
    } catch {
      setWatchlistByDomain((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== target)));
    }
  }

  const handlers: GenUiHandlers = {
    onWatchlist: (company, target) => void addToWatchlist(company, target),
    watchlistByDomain,
    // Follow-ups run in the Score workspace, where the conversation lives.
    onPrompt: () => router.push(scoreHref(domain, "last")),
  };

  return (
    <ShellPanel open size="wide" label={`${domain} account details`} onClose={onClose}>
      {report ? (
        <ScoreReportPanel
          // Remount when the page's extra tab arrives (e.g. after pipeline data loads)
          // so it becomes the selected tab, as it is when opened by a click.
          key={`${domain}:${extraTab?.value ?? ""}`}
          report={report}
          handlers={handlers}
          busy={false}
          onClose={onClose}
          onRescore={(target) => router.push(scoreHref(target))}
          extraTab={extraTab}
          closeLabel="Close account panel"
        />
      ) : (
        <AccountStatePanel
          domain={domain}
          state={state as Exclude<AccountReportState, { status: "ready" }>}
          onClose={onClose}
          onRetry={() => setReloadKey((key) => key + 1)}
          extraTab={extraTab}
        />
      )}
    </ShellPanel>
  );
}
