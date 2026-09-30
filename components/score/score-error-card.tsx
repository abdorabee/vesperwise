import Link from "next/link";
import { AlertCircle, CreditCard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Typed failure from `/api/v1/score` (same status/code the JSON API returns). */
export interface ScoreFailure {
  status: number;
  code?: string;
  message: string;
  creditsRemaining?: number;
  retryAfterSeconds?: number;
}

export function ScoreErrorCard({
  failure,
  domain,
  onRetry,
  onReset,
}: {
  failure: ScoreFailure;
  domain?: string;
  onRetry?: (domain: string) => void;
  onReset?: () => void;
}) {
  if (failure.status === 402) {
    const credits = failure.creditsRemaining ?? 0;
    return (
      <section role="alert" className="score-error-card-shake rounded-lg border border-border/70 bg-card/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Not enough credits to score{domain ? ` ${domain}` : ""}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">{credits}</span> {credits === 1 ? "credit" : "credits"} left. A fresh score uses 1 credit; nothing was charged.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="brand"><Link href="/billing">Top up</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/billing#plans">See plans</Link></Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (failure.code === "no_stored_score") {
    return (
      <section className="rounded-lg border border-border/70 bg-card/40 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">No stored score for {domain ?? "this domain"} yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Score it now to verify current signals.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {domain && onRetry ? <Button size="sm" variant="brand" onClick={() => onRetry(domain)}>Score now · 1 credit</Button> : null}
          {onReset ? <Button size="sm" variant="ghost" onClick={onReset}>Score another company</Button> : null}
        </div>
      </section>
    );
  }

  const heading = failure.status === 409 ? "This company is still being scored" : failure.status === 400 ? "That domain couldn't be scored" : "Scoring didn't finish";
  return (
    <section role="alert" className="score-error-card-shake rounded-lg border border-border/70 bg-card/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{failure.message}{failure.status >= 500 ? " No credit was charged." : ""}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {domain && onRetry && failure.status !== 400 ? <Button size="sm" variant="outline" onClick={() => onRetry(domain)}><RotateCcw className="size-4" aria-hidden="true" />Retry</Button> : null}
            {onReset ? <Button size="sm" variant="ghost" onClick={onReset}>Score another company</Button> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
