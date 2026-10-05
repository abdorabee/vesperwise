"use client";

import { OnboardingRail } from "@/components/onboarding/onboarding-shell";
import { ScoreCell, timeAgo, topDriver, type ScoredAccount } from "@/components/onboarding/results-shared";

const CORE_SIGNALS = ["funding", "hiring", "news", "technology"] as const;

export function EmptyStateScreen({
  accounts,
  threshold,
  onLowerThreshold,
  onWidenIcp,
}: {
  accounts: ScoredAccount[];
  threshold: number;
  onLowerThreshold: (value: number) => void;
  onWidenIcp: () => void;
}) {
  const sorted = [...accounts].sort((a, b) => (b.result.intent_score ?? -1) - (a.result.intent_score ?? -1));
  const highest = sorted[0]?.result.intent_score ?? 0;
  const nearMiss = sorted.filter((a) => (a.result.intent_score ?? 0) >= Math.max(0, threshold - 15));
  const suggestedThreshold = Math.max(40, highest - 1);

  const diagnosis = CORE_SIGNALS.map((key) => {
    const hits = accounts.filter((a) => (a.result.signals[key]?.score ?? 0) > 0).length;
    return { key, hits, total: accounts.length };
  });
  const quietest = [...diagnosis].sort((a, b) => a.hits - b.hits)[0];

  return (
    <>
      <div className="overflow-y-auto p-12 pb-0">
        <h1 className="m-0 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
            Nothing cleared {threshold}. Here&rsquo;s what <span className="text-[var(--brand)]">did</span>.
          </h1>
          <p className="mt-3 max-w-[600px] text-[13px] leading-[1.6] text-[#a0a0a0]">
            The run worked — {accounts.length} {accounts.length === 1 ? "account" : "accounts"} scored, six sources
            checked on each. Your threshold is simply above what these accounts show right now.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08]">
            <div className="bg-black px-[18px] py-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">Scored</div>
              <div className="mt-2.5 font-mono text-2xl tabular-nums text-white">{accounts.length}</div>
            </div>
            <div className="bg-black px-[18px] py-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">Highest score</div>
              <div className="mt-2.5 font-mono text-2xl tabular-nums text-[#f5b544]">{highest}</div>
            </div>
            <div className="bg-black px-[18px] py-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">Close to threshold</div>
              <div className="mt-2.5 font-mono text-2xl tabular-nums text-white">{nearMiss.length}</div>
            </div>
          </div>

          {nearMiss.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2.5 px-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#666]">
                <span>Closest to your threshold</span>
                <span className="h-px flex-1 bg-white/[0.04]" />
                <span className="rounded-full border border-white/[0.08] bg-[#111] px-[7px] py-px text-[10px]">
                  {nearMiss.length}
                </span>
              </div>
              <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]">
                {nearMiss.map((account) => (
                  <div
                    key={account.domain}
                    className="grid grid-cols-[56px_minmax(150px,1.3fr)_78px_1fr_96px] items-center gap-3.5 border-t border-white/[0.04] px-4 py-2.5 first:border-t-0"
                  >
                    <ScoreCell score={account.result.intent_score} />
                    <div className="min-w-0">
                      <div className="font-mono text-[12.5px] leading-[1.3] text-white">{account.domain}</div>
                      <div className="mt-px truncate text-[11px] leading-[1.3] text-[#666]">{account.result.company}</div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#f5b544]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-[#f5b544]" style={{ border: "1px solid rgba(245,181,68,.25)" }}>
                      <span className="h-[5px] w-[5px] rounded-full bg-[#f5b544]" />
                      Warm
                    </span>
                    <span className="truncate text-[12px] leading-[1.4] text-[#a0a0a0]">{topDriver(account.result)}</span>
                    <span className="text-right text-[11px] leading-[1.4] text-[#666]">{timeAgo(account.result.last_updated)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onLowerThreshold(suggestedThreshold)}
              className="flex h-10 items-center justify-center rounded-lg bg-[var(--brand)] px-5 font-sans text-[13px] font-semibold text-[var(--on-brand)] hover:bg-[var(--brand)] hover:shadow-[0_0_0_3px_var(--brand-soft)] active:bg-[var(--brand-active)]"
            >
              Lower the threshold to {suggestedThreshold}
            </button>
            <button
              type="button"
              onClick={onWidenIcp}
              className="flex h-10 items-center justify-center rounded-lg border border-white/[0.08] px-4 font-sans text-[13px] font-medium text-white hover:bg-white/[0.04]"
            >
              Widen the ICP
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex h-10 cursor-not-allowed items-center justify-center rounded-lg border border-white/[0.08] px-4 font-sans text-[13px] font-medium text-white opacity-50"
            >
              Alert me when one clears 75
            </button>
          </div>
      </div>

      <OnboardingRail title="Why nothing cleared">
        <div className="flex flex-col">
          {diagnosis.map((d) => (
            <div key={d.key} className="border-b border-white/[0.04] py-3.5 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[12.5px] leading-[1.3] text-white">{d.key}</span>
                <span className="font-mono text-[12px] tabular-nums text-white">
                  {d.hits} / {d.total}
                </span>
              </div>
              <div className="mt-1.5 text-[12px] leading-[1.5] text-[#666]">accounts had a real signal</div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-6 text-[12px] leading-[1.6] text-[#a0a0a0]" style={{ textWrap: "pretty" }}>
          {quietest
            ? `${quietest.key} was the quietest source in this run (${quietest.hits} of ${quietest.total}). A 75 usually needs several sources firing on the same account at once.`
            : "A 75 usually needs several sources firing on the same account at once."}
        </div>
      </OnboardingRail>
    </>
  );
}
