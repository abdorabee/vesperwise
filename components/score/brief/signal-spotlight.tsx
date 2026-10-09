"use client";

import { BandPill } from "@/components/score/band";
import type { BriefSection } from "@/lib/brief";
import { contributionFor, formatSignalAge, renderSpecText, signalLabel } from "./brief-ui";
import type { BriefSectionProps } from "./types";

type SignalSpotlightSection = Extract<BriefSection, { type: "signal_spotlight" }>;

export function SignalSpotlight({ section, block, ctx, projected, now, state }: BriefSectionProps & { section: SignalSpotlightSection }) {
  const contribution = contributionFor(block.contributions, section.signal);
  const projectedPoints = projected.perSignal[section.signal] ?? 0;
  const nowPoints = now.perSignal[section.signal] ?? 0;
  const ageNow = contribution?.daysAgo == null ? null : contribution.daysAgo + state.elapsedDays;

  return (
    <section aria-labelledby={`brief-spotlight-${section.signal}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`brief-spotlight-${section.signal}`} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Signal spotlight</h3>
        <BandPill band={projected.band} size="sm" />
      </div>
      <div className="rounded-lg border border-border/70 bg-card/35 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{signalLabel(section.signal)}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {state.offsetDays > 0 ? `${Math.round(nowPoints)} → ${Math.round(projectedPoints)} pts` : `${Math.round(nowPoints)} pts`}
          </p>
        </div>
        <p className="mt-2 text-pretty text-[15px] leading-7 text-foreground">{renderSpecText(section.take, ctx)}</p>
        {contribution ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {contribution.summary} · {formatSignalAge(ageNow)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
