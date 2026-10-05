"use client";

import { useState } from "react";

import { BandBadge, ScoreCell, SignalDots, timeAgo, topDriver, type ScoredAccount } from "@/components/onboarding/results-shared";
import { SignalEvidenceRow } from "@/components/onboarding/evidence-row";
import { OnboardingRail, RailRow } from "@/components/onboarding/onboarding-shell";
import { Slider } from "@/components/ui/slider";

const BAND_CHIP: { label: string; color: string }[] = [
  { label: "HOT", color: "var(--band-hot-fill)" },
  { label: "WARM", color: "var(--band-warm-fill)" },
  { label: "COLD", color: "var(--band-cold-fill)" },
];

export function ResultsScreen({
  accounts,
  visible,
  threshold,
  onThresholdChange,
}: {
  /** Every account that finished scoring, regardless of threshold. */
  accounts: ScoredAccount[];
  /** accounts filtered to the current threshold, sorted descending. */
  visible: ScoredAccount[];
  threshold: number;
  onThresholdChange: (value: number) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(visible[0]?.domain ?? null);

  const hotCount = accounts.filter((a) => (a.result.intent_score ?? 0) >= 75).length;
  const warmCount = accounts.filter((a) => (a.result.intent_score ?? 0) >= 50 && (a.result.intent_score ?? 0) < 75).length;
  const coldCount = accounts.length - hotCount - warmCount;
  const counts: Record<string, number> = { HOT: hotCount, WARM: warmCount, COLD: coldCount };

  return (
    <>
      <div className="overflow-y-auto p-12">
        <div className="flex items-end justify-between gap-8">
            <div>
              <h1 className="m-0 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
                {visible.length} {visible.length === 1 ? "account" : "accounts"} cleared{" "}
                <span className="text-[var(--brand)]">{threshold}</span>.
              </h1>
              <p className="mt-3 max-w-[560px] text-[13px] leading-[1.6] text-[#a0a0a0]">
                Out of {accounts.length} scored. Every score opens to the evidence that produced it — nothing here
                is a black box.
              </p>
            </div>
            <div className="flex flex-none gap-2">
              {BAND_CHIP.map((c) => (
                <span
                  key={c.label}
                  className="flex h-7 items-center gap-1.5 rounded-full px-2.5 font-mono text-[11px] tracking-[0.02em]"
                  style={{ background: c.color, border: "1px solid transparent", color: `var(--band-${c.label.toLowerCase()}-ink)` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--band-${c.label.toLowerCase()}-ink)` }} />
                  {c.label} {counts[c.label]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]">
            <div className="grid h-[34px] grid-cols-[56px_minmax(150px,1.3fr)_78px_76px_1fr_74px] items-center gap-3.5 bg-[#181818] px-4 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-[#666]">
              <span>Score</span>
              <span>Company</span>
              <span>Band</span>
              <span>Signals</span>
              <span>Top driver</span>
              <span className="text-right">Scored</span>
            </div>
            {visible.map((account) => {
              const isOpen = expanded === account.domain;
              return (
                <div key={account.domain} className="border-t border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : account.domain)}
                    className="grid w-full grid-cols-[56px_minmax(150px,1.3fr)_78px_76px_1fr_74px] items-center gap-3.5 px-4 py-2.5 text-left hover:bg-white/[0.02]"
                  >
                    <ScoreCell score={account.result.intent_score} />
                    <div className="min-w-0">
                      <div className="font-mono text-[12.5px] leading-[1.3] text-white">{account.domain}</div>
                      <div className="mt-px truncate text-[11px] leading-[1.3] text-[#666]">{account.result.company}</div>
                    </div>
                    <BandBadge score={account.result.intent_score} />
                    <SignalDots result={account.result} />
                    <span className="truncate text-[12px] leading-[1.4] tracking-[-0.006em] text-[#a0a0a0]">
                      {topDriver(account.result)}
                    </span>
                    <span className="text-right font-mono text-[11px] text-[#4a4a4a]">
                      {timeAgo(account.result.last_updated)}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/[0.04] bg-[#0a0a0a] py-5 pr-4 pb-5 pl-[72px]">
                      <div className="flex items-baseline justify-between">
                        <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">
                          Why {account.domain} scored {account.result.intent_score}
                        </div>
                      </div>
                      <SignalEvidenceRow signals={account.result.signals} />
                      {account.result.why_now && (
                        <p className="mt-4 max-w-[620px] text-[12.5px] leading-[1.6] text-[#a0a0a0]" style={{ textWrap: "pretty" }}>
                          {account.result.why_now}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      </div>

      <OnboardingRail title="Why these cleared">
        <div className="flex flex-col">
          <RailRow label="Threshold cleared" value={`${visible.length} of ${accounts.length} accounts`} />
          <RailRow label="Strongest driver" value={visible[0] ? topDriver(visible[0].result) : "—"} />
          <RailRow label="Sources used" value="4 scored · web + github context-only" />
        </div>
        <div className="mt-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#666]">Threshold</div>
          <div className="mt-3.5 flex items-baseline gap-2">
            <span className="font-mono text-[28px] font-medium tabular-nums text-white">{threshold}</span>
            <span className="text-[12px] text-[#666]">{visible.length} accounts</span>
          </div>
          <div className="mt-3">
            <Slider value={[threshold]} min={40} max={90} step={1} onValueChange={([v]) => onThresholdChange(v)} />
          </div>
          <div className="mt-2.5 text-[12px] leading-[1.5] text-[#666]">Drag to see the list grow or shrink, live.</div>
        </div>
        <div className="mt-auto pt-6 text-[12px] leading-[1.6] text-[#666]">
          These scores were computed live, just now, from the real signal pipeline — not a preview or a mock.
        </div>
      </OnboardingRail>
    </>
  );
}
