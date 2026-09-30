"use client";

import { useEffect, useRef, useState } from "react";

import { OnboardingRail } from "@/components/onboarding/onboarding-shell";
import type { ScoringRunEntry } from "@/lib/onboarding-run";
import type { SignalSet } from "@/lib/types";

const SOURCE_KEYS = ["funding", "hiring", "news", "technology", "web", "github"] as const;

function sourceRows(entries: ScoringRunEntry[]) {
  const settled = entries.filter((e) => e.status === "done" || e.status === "error");
  const done = entries.filter((e) => e.status === "done" && e.result);

  return SOURCE_KEYS.map((key) => {
    let hits = 0;
    let latest: { domain: string; detail: string } | null = null;
    for (const entry of done) {
      const signal = (entry.result!.signals as SignalSet)[key];
      if (signal && signal.score > 0) {
        hits += 1;
        latest = { domain: entry.domain, detail: signal.detail };
      }
    }
    return { key, checked: settled.length, hits, latest };
  });
}

export function ScoringRunScreen({ entries }: { entries: ScoringRunEntry[] }) {
  const total = entries.length;
  const settledCount = entries.filter((e) => e.status === "done" || e.status === "error").length;
  const doneEntries = entries.filter((e) => e.status === "done" && e.result);
  const cleared = doneEntries.filter((e) => (e.result!.intent_score ?? 0) >= 75).length;
  const pct = total > 0 ? Math.round((settledCount / total) * 100) : 0;

  const startedAtRef = useRef<number | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const remaining = total - settledCount;

  useEffect(() => {
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (remaining === 0 || settledCount === 0 || startedAtRef.current === null) return;
    const tick = () => {
      const elapsedMs = Date.now() - (startedAtRef.current ?? Date.now());
      const avgMsPerAccount = elapsedMs / settledCount;
      setEtaSeconds(Math.max(1, Math.round((avgMsPerAccount * remaining) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [settledCount, remaining]);

  let etaLabel = "estimating…";
  if (remaining === 0) {
    etaLabel = "done";
  } else if (etaSeconds !== null) {
    etaLabel = `about ${etaSeconds} second${etaSeconds === 1 ? "" : "s"} left`;
  }

  const firstHot = doneEntries.find((e) => (e.result!.intent_score ?? 0) >= 75);

  return (
    <>
      <div className="overflow-y-auto p-12 pb-0">
        <div className="max-w-[600px]">
          <div className="flex items-end justify-between gap-8">
            <div>
              <h1 className="m-0 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
                Scoring <span className="text-[var(--brand)]">{total}</span> {total === 1 ? "account" : "accounts"}.
              </h1>
              <p className="mt-3 max-w-[520px] text-[13px] leading-[1.6] text-[#a0a0a0]">
                Six sources, checked per account. Results appear as each one clears — you don&rsquo;t have to wait
                for the whole run.
              </p>
            </div>
            <div className="flex-none text-right">
              <div className="font-mono text-[44px] font-medium leading-none tracking-[-0.03em] text-[#4ade80] tabular-nums">
                {cleared}
              </div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">cleared 75 so far</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#666]">
                {settledCount} of {total} checked
              </span>
              <span className="text-[12px] text-[#666]">{etaLabel}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-1 rounded-full bg-[var(--brand)] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]">
            <div className="grid h-[34px] grid-cols-[180px_1fr_110px_88px] items-center gap-4 bg-[#181818] px-4 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-[#666]">
              <span>Source</span>
              <span>Latest hit</span>
              <span>Checked</span>
              <span>Hits</span>
            </div>
            {sourceRows(entries).map((row) => (
              <div key={row.key} className="grid grid-cols-[180px_1fr_110px_88px] items-center gap-4 border-t border-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: row.hits > 0 ? "#4ade80" : "rgba(255,255,255,.13)" }}
                  />
                  <span className="font-mono text-[12.5px] text-white">{row.key}</span>
                </div>
                <span className="truncate text-[13px] leading-[1.4] tracking-[-0.006em] text-[#a0a0a0]">
                  {row.latest ? `${row.latest.domain} — ${row.latest.detail}` : "—"}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-[#a0a0a0]">{row.checked}</span>
                <span className="font-mono text-[12px] tabular-nums" style={{ color: row.hits > 0 ? "#f7f8f8" : "#4a4a4a" }}>
                  {row.hits}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[12.5px] leading-[1.6] text-[#666]">
            Feel free to keep this tab open — every account here is being scored with the real pipeline, not a
            preview.
          </p>
        </div>
      </div>

      <OnboardingRail title="Running against">
        <div className="text-[13px] leading-[1.5] text-[#a0a0a0]">
          Scoring each account you added on the previous step, using the six pipeline sources with their fixed
          weights.
        </div>
        {firstHot && (
          <div className="mt-auto flex flex-col gap-2 pt-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#666]">First to clear</div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[17px] font-medium tabular-nums text-[#4ade80]">
                {firstHot.result!.intent_score}
              </span>
              <span className="font-mono text-[12.5px] text-white">{firstHot.domain}</span>
            </div>
            {firstHot.result!.why_now && (
              <div className="text-[12px] leading-[1.5] text-[#666]">{firstHot.result!.why_now}</div>
            )}
          </div>
        )}
      </OnboardingRail>
    </>
  );
}
