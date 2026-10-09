"use client";

import type { BriefSection } from "@/lib/brief";
import { renderSpecText } from "./brief-ui";
import type { BriefSectionProps } from "./types";

type WhyNowBriefSection = Extract<BriefSection, { type: "why_now" }>;

export function WhyNowSection({ section, ctx }: BriefSectionProps & { section: WhyNowBriefSection }) {
  return (
    <section aria-labelledby="brief-why-now-title" className="space-y-2">
      <h3 id="brief-why-now-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Why now</h3>
      <p className="text-pretty text-[15px] leading-7 text-foreground sm:text-base">{renderSpecText(section.text, ctx)}</p>
    </section>
  );
}
