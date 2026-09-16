"use client";

import BloubMascot from "@/components/mascot/bloub-mascot";
import { Button } from "@/components/ui/button";
import { ScoreComposer } from "@/components/score/score-composer";

const EXAMPLES = ["stripe.com", "anthropic.com", "linear.app"];

export function ScoreEmptyState({ onSubmit, creditsRemaining, busy }: { onSubmit: (value: string) => void; creditsRemaining: number; busy: boolean }) {
  return (
    <div className="flex min-h-[calc(100svh-7rem)] flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="score-bloub score-bloub-waiting mb-5 text-primary" aria-label="Bloub is waiting">
        <BloubMascot size={38} color="currentColor" paper="transparent" follow={false} playing={false} />
      </div>
      <h1 className="text-balance text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">Which company should we score?</h1>
      <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">Enter a domain to verify dated purchase signals and decide whether the account is worth pursuing now.</p>
      <div className="mt-8 w-full"><ScoreComposer initial autoFocus busy={busy} onSubmit={onSubmit} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground"><span>Try</span>{EXAMPLES.map((domain) => <Button key={domain} type="button" variant="link" size="xs" disabled={busy} className="h-auto px-1 py-0 text-xs" onClick={() => onSubmit(domain)}>{domain}</Button>)}</div>
      <p className="mt-3 text-xs text-muted-foreground"><span className="font-medium tabular-nums text-foreground">{creditsRemaining}</span> credits remaining · cached results are free</p>
    </div>
  );
}
