"use client";

import { BandPill } from "@/components/score/band";
import type { BriefSection } from "@/lib/brief";
import { cn } from "@/lib/utils";
import { formatOffset, formatSignalAge, freshestSignalAge, renderSpecText, signalLabel } from "./brief-ui";
import type { BriefSectionProps } from "./types";

type TimingSection = Extract<BriefSection, { type: "timing_slider" }>;

export function TimingSlider({ section, block, ctx, projected, now, state }: BriefSectionProps & { section: TimingSection }) {
  const today = now;
  const cost = Math.max(0, today.score - projected.score);
  const freshestAtScoring = freshestSignalAge(block.contributions);
  const freshest = freshestAtScoring == null ? null : freshestAtScoring + state.elapsedDays;
  const verdict = state.offsetDays === 0
    ? `Freshest signal is ${formatSignalAge(freshest)}. Drag to see what waiting costs.`
    : `Waiting ${formatOffset(state.offsetDays)} costs ${cost} ${cost === 1 ? "point" : "points"}${projected.band !== today.band ? ` and drops it to ${projected.band}` : ""}.`;
  // Scale against today so bars visibly shrink as the slider moves forward.
  const maxSignal = Math.max(1, ...Object.values(today.perSignal));

  return (
    <section aria-labelledby="brief-timing-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="brief-timing-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">If you reach out in…</h3>
          <p className="mt-1 text-sm font-medium text-foreground">{formatOffset(state.offsetDays)}</p>
        </div>
        <BandPill band={projected.band} size="sm" />
      </div>

      <input
        aria-label="Days before outreach"
        className="w-full accent-[var(--brand)]"
        type="range"
        min={0}
        max={120}
        step={1}
        value={state.offsetDays}
        onChange={(event) => state.setOffsetDays(Number(event.currentTarget.value))}
      />

      <div className="space-y-2">
        {block.contributions.map((contribution) => {
          const current = projected.perSignal[contribution.type] ?? 0;
          const todayValue = today.perSignal[contribution.type] ?? 0;
          const ratio = Math.max(0, Math.min(1, current / maxSignal));
          const todayRatio = Math.max(0, Math.min(1, todayValue / maxSignal));
          return (
            <div key={contribution.type} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.25rem] items-center gap-3 text-xs">
              <span className="font-medium text-foreground">{signalLabel(contribution.type)}</span>
              <span aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="absolute inset-y-0 left-0 rounded-full bg-foreground/15" style={{ width: `${todayRatio * 100}%` }} />
                <span className={cn("brief-score-fill relative block h-full rounded-full", current < todayValue ? "bg-[var(--brand)]" : "bg-foreground")} style={{ width: `${ratio * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{Math.round(current)} pts</span>
            </div>
          );
        })}
      </div>

      <p className="text-sm font-medium leading-6 text-foreground">{verdict}</p>
      {section.note ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {renderSpecText(section.note, ctx)}
        </p>
      ) : null}
      {block.contributions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trigger contributions are available yet.</p>
      ) : null}
      {state.offsetDays > 0 ? (
        <p className="sr-only">Projected score {projected.score} of 100 after waiting {formatOffset(state.offsetDays)}.</p>
      ) : null}
    </section>
  );
}
