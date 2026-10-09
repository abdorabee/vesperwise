"use client";

import { BandPill } from "@/components/score/band";
import { projectScore, type BriefSection } from "@/lib/brief";
import { renderSpecText, signalLabel } from "./brief-ui";
import type { BriefSectionProps } from "./types";

type WhatWouldChangeSection = Extract<BriefSection, { type: "what_would_change" }>;

export function WhatWouldChange({ section, block, ctx, state }: BriefSectionProps & { section: WhatWouldChangeSection }) {
  return (
    <section aria-labelledby="brief-change-title" className="space-y-3">
      <h3 id="brief-change-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">What would change</h3>
      <ul className="grid gap-2">
        {section.items.map((item) => {
          const uplift = projectScore(block.contributions, state.elapsedDays, { [item.signal]: "max" });
          return (
            <li key={`${item.signal}-${item.if}`} className="rounded-lg border border-border/70 bg-card/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{renderSpecText(item.if, ctx)}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground">
                  -&gt; {uplift.score} <BandPill band={uplift.band} size="sm" />
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{signalLabel(item.signal)} at max signal strength</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
