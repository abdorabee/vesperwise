"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { projectScore, type BriefContext, type BriefSection, type TriggerKey } from "@/lib/brief";
import { daysSinceScored, renderSpecText } from "./brief-ui";
import { NextSteps } from "./next-steps";
import { OpenerPicker } from "./opener-picker";
import { ScoreHeroSection } from "./score-hero-section";
import { SignalSpotlight } from "./signal-spotlight";
import { TimingSlider } from "./timing-slider";
import type { BriefSectionProps, LivingBriefBlock, LivingBriefHandlers } from "./types";
import { WhatWouldChange } from "./what-would-change";
import { WhyNowSection } from "./why-now-section";

export function LivingBrief({
  block,
  handlers,
  fresh = false,
}: {
  block: LivingBriefBlock;
  handlers: LivingBriefHandlers;
  fresh?: boolean;
}) {
  const [offsetDays, setOffsetDays] = useState(0);
  const [angle, setAngle] = useState<TriggerKey | undefined>(() => initialAngle(block));
  const [persona, setPersona] = useState<string | undefined>(() => initialPersona(block));
  const [elapsedDays] = useState(() => daysSinceScored(block.last_updated));
  const now = useMemo(() => {
    if (elapsedDays === 0) return { ...projectScore(block.contributions, 0), score: block.intent_score, band: block.score_band };
    return projectScore(block.contributions, elapsedDays);
  }, [block.contributions, block.intent_score, block.score_band, elapsedDays]);
  const projected = useMemo(
    () => (offsetDays === 0 ? now : projectScore(block.contributions, elapsedDays + offsetDays)),
    [block.contributions, elapsedDays, now, offsetDays],
  );
  const displayScore = projected.score;
  const displayBand = projected.band;
  const effectiveAngle = normalizeAngle(block, angle);
  const effectivePersona = normalizePersona(block, persona);
  const baseCtx: BriefContext = {
    company: block.company,
    score: displayScore,
    band: displayBand,
    contributions: block.contributions,
    angle: effectiveAngle,
  };
  const ctx: BriefContext = {
    ...baseCtx,
    persona: effectivePersona,
  };
  if (effectivePersona) ctx.persona = renderSpecText(effectivePersona, baseCtx);
  const sectionProps: BriefSectionProps = {
    block,
    ctx,
    projected,
    now,
    displayScore,
    displayBand,
    fresh,
    handlers,
    state: {
      elapsedDays,
      offsetDays,
      setOffsetDays,
      angle: effectiveAngle,
      setAngle,
      persona: effectivePersona,
      setPersona,
    },
  };

  return (
    <article data-slot="living-brief" className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Living Brief</p>
        {block.spec.headline ? (
          <h2 className="brief-section-in text-pretty font-serif text-2xl leading-tight text-foreground sm:text-3xl">
            {renderSpecText(block.spec.headline, ctx)}
          </h2>
        ) : null}
      </div>
      <div className="space-y-6">
        {block.spec.layout.map((section, index) => {
          const rendered = renderSection(section, sectionProps);
          if (!rendered) return null;
          return (
            <div
              key={`${section.type}-${index}`}
              className="brief-section-in"
              style={{ "--brief-i": index } as CSSProperties}
            >
              {rendered}
            </div>
          );
        })}
      </div>
    </article>
  );
}

const SECTION_RENDERERS = {
  score_hero: (_section: Extract<BriefSection, { type: "score_hero" }>, props: BriefSectionProps) => <ScoreHeroSection {...props} />,
  why_now: (section: Extract<BriefSection, { type: "why_now" }>, props: BriefSectionProps) => <WhyNowSection section={section} {...props} />,
  timing_slider: (section: Extract<BriefSection, { type: "timing_slider" }>, props: BriefSectionProps) => <TimingSlider section={section} {...props} />,
  signal_spotlight: (section: Extract<BriefSection, { type: "signal_spotlight" }>, props: BriefSectionProps) => <SignalSpotlight section={section} {...props} />,
  what_would_change: (section: Extract<BriefSection, { type: "what_would_change" }>, props: BriefSectionProps) => <WhatWouldChange section={section} {...props} />,
  opener_picker: (section: Extract<BriefSection, { type: "opener_picker" }>, props: BriefSectionProps) => <OpenerPicker section={section} {...props} />,
  next_steps: (section: Extract<BriefSection, { type: "next_steps" }>, props: BriefSectionProps) => <NextSteps section={section} {...props} />,
};

function renderSection(section: BriefSection, props: BriefSectionProps): ReactNode {
  switch (section.type) {
    case "score_hero": return SECTION_RENDERERS.score_hero(section, props);
    case "why_now": return SECTION_RENDERERS.why_now(section, props);
    case "timing_slider": return SECTION_RENDERERS.timing_slider(section, props);
    case "signal_spotlight": return SECTION_RENDERERS.signal_spotlight(section, props);
    case "what_would_change": return SECTION_RENDERERS.what_would_change(section, props);
    case "opener_picker": return SECTION_RENDERERS.opener_picker(section, props);
    case "next_steps": return SECTION_RENDERERS.next_steps(section, props);
  }
}

function openerAngles(block: LivingBriefBlock): TriggerKey[] {
  return Object.keys(block.spec.openers).filter((angle): angle is TriggerKey => {
    const openers = block.spec.openers[angle as TriggerKey];
    return Boolean(openers && Object.keys(openers).length > 0);
  });
}

function openerPickerSection(block: LivingBriefBlock) {
  return block.spec.layout.find((section): section is Extract<BriefSection, { type: "opener_picker" }> => section.type === "opener_picker");
}

function initialAngle(block: LivingBriefBlock): TriggerKey | undefined {
  const angles = openerAngles(block);
  const preferred = openerPickerSection(block)?.default_angle;
  return preferred && angles.includes(preferred) ? preferred : angles[0];
}

function initialPersona(block: LivingBriefBlock): string | undefined {
  const preferred = openerPickerSection(block)?.default_persona;
  return preferred && block.spec.personas.includes(preferred) ? preferred : block.spec.personas[0];
}

function normalizeAngle(block: LivingBriefBlock, angle: TriggerKey | undefined): TriggerKey | undefined {
  const angles = openerAngles(block);
  return angle && angles.includes(angle) ? angle : angles[0];
}

function normalizePersona(block: LivingBriefBlock, persona: string | undefined): string | undefined {
  return persona && block.spec.personas.includes(persona) ? persona : block.spec.personas[0];
}
