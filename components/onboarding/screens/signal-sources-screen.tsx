"use client";

import { OnboardingRail } from "@/components/onboarding/onboarding-shell";
import { Switch } from "@/components/ui/switch";
import { TRIGGER_WEIGHTS } from "@/lib/scorer";

const MAX_WEIGHT = Math.max(...Object.values(TRIGGER_WEIGHTS));

const SOURCES = [
  { key: "funding", detects: "Rounds, extensions, valuations", provider: "Explorium", weight: TRIGGER_WEIGHTS.funding, contextOnly: false },
  { key: "hiring", detects: "Open roles in Sales, RevOps, Eng", provider: "Explorium", weight: TRIGGER_WEIGHTS.hiring, contextOnly: false },
  { key: "news", detects: "Leadership changes, launches, partnerships", provider: "GNews", weight: TRIGGER_WEIGHTS.news, contextOnly: false },
  { key: "technology", detects: "Tools added or dropped from the stack", provider: "BuiltWith", weight: TRIGGER_WEIGHTS.technology, contextOnly: false },
  { key: "web", detects: "Size and shape of web presence", provider: "Open PageRank", weight: null, contextOnly: true },
  { key: "github", detects: "Repo pushes, new repos this quarter", provider: "GitHub", weight: null, contextOnly: true },
] as const;

export function SignalSourcesScreen({ seedCount }: { seedCount: number }) {
  return (
    <>
      <div className="overflow-y-auto p-12 pb-0">
        <h1 className="m-0 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
          Six sources, already <span className="text-[var(--brand)]">watching</span>.
        </h1>
        <p className="mt-3 max-w-[560px] text-[13px] leading-[1.6] text-[#a0a0a0]">
          Nothing to connect — we crawl these ourselves. Weighting is fixed for every workspace; the weight column
          is how much of the score each source can move.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]">
            <div className="grid h-[34px] grid-cols-[200px_1fr_120px_96px_44px] items-center gap-4 bg-[#181818] px-4 font-sans text-[11px] font-medium uppercase tracking-[0.04em] text-[#666]">
              <span>Source</span>
              <span>What it detects</span>
              <span>Provider</span>
              <span>Weight</span>
              <span />
            </div>
            {SOURCES.map((source) => (
              <div
                key={source.key}
                className="grid grid-cols-[200px_1fr_120px_96px_44px] items-center gap-4 border-t border-white/[0.04] px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className="font-mono text-[12.5px] font-medium leading-[1.3] text-white">{source.key}</span>
                  <span className="text-[11px] leading-[1.3] text-[#666]">{source.contextOnly ? "context only" : "scores directly"}</span>
                </div>
                <span className="text-[13px] leading-[1.45] tracking-[-0.006em] text-[#a0a0a0]">{source.detects}</span>
                <span className="font-mono text-[12px] text-[#666]">{source.provider}</span>
                <div className="flex items-center gap-2">
                  {source.weight !== null ? (
                    <>
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-1 rounded-full bg-white/40" style={{ width: `${Math.round((source.weight / MAX_WEIGHT) * 100)}%` }} />
                      </div>
                      <span className="font-mono text-[12px] tabular-nums text-white">{source.weight}</span>
                    </>
                  ) : (
                    <span className="font-mono text-[12px] text-[#4a4a4a]">—</span>
                  )}
                </div>
                <div className="justify-self-end">
                  <Switch checked={!source.contextOnly} disabled aria-label={`${source.key} weighting is fixed`} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-6 rounded-xl border border-white/[0.08] p-4">
            <div>
              <div className="font-sans text-[13px] font-medium leading-[1.4] text-white">
                Connect a CRM to drop accounts you already own
              </div>
              <div className="mt-1 text-[12px] leading-[1.5] text-[#666]">
                Optional. Without it, expect a few current customers in the first list. Coming soon.
              </div>
            </div>
            <div className="flex flex-none gap-2">
              <div className="flex h-8 cursor-not-allowed items-center rounded-lg border border-white/[0.08] px-3 font-sans text-[12px] font-medium text-[#a0a0a0]">
                HubSpot
              </div>
              <div className="flex h-8 cursor-not-allowed items-center rounded-lg border border-white/[0.08] px-3 font-sans text-[12px] font-medium text-[#a0a0a0]">
                Salesforce
              </div>
            </div>
          </div>
      </div>

      <OnboardingRail title="Ready to score">
        <div className="flex flex-col gap-1">
          <div className="font-mono text-[28px] font-medium tabular-nums text-white">{seedCount}</div>
          <div className="text-[12px] text-[#666]">{seedCount === 1 ? "account" : "accounts"} from your ICP preview</div>
        </div>
        <div className="mt-auto pt-6 text-[12px] leading-[1.6] text-[#666]">
          These are the domains you added on the previous step. We&rsquo;ll score them live, one at a time, using
          the six sources above.
        </div>
      </OnboardingRail>
    </>
  );
}
