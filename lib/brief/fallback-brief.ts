import type { ScoreBand } from "../types";
import {
  TRIGGER_KEYS,
  type BriefSection,
  type BriefSpec,
  type TriggerKey,
} from "./brief-schema";
import type { BriefContribution } from "./brief-data";

const DEFAULT_PERSONAS = ["VP Sales", "RevOps lead", "CFO"] as const;

function byStrengthDesc(a: BriefContribution, b: BriefContribution): number {
  return b.contribution - a.contribution || b.rawScore - a.rawScore;
}

function byStrengthAsc(a: BriefContribution, b: BriefContribution): number {
  return a.contribution - b.contribution || a.rawScore - b.rawScore;
}

function hasPositiveSignal(contribution: BriefContribution): boolean {
  return contribution.status === "ok" || contribution.status === "stale" || contribution.rawScore > 0 || contribution.contribution > 0;
}

function triggerContributions(contributions: BriefContribution[]): BriefContribution[] {
  return contributions.filter((item) => (TRIGGER_KEYS as readonly string[]).includes(item.type));
}

function openerText(signal: TriggerKey): Record<string, string> {
  const detail = "{signal." + signal + ".detail}";
  return {
    "VP Sales": `Noticed ${detail} at {company}. Moments like this usually mean quota moves faster than the team's tooling.`,
    "RevOps lead": `With ${detail}, {company}'s routing, territories, and forecasts are about to get busier.`,
    CFO: `${detail} at {company} usually brings a fresh look at which growth spend actually pays back.`,
  };
}

function buildOpeners(contributions: BriefContribution[]): BriefSpec["openers"] {
  const positive = triggerContributions(contributions).filter(hasPositiveSignal);
  const source = positive.length > 0
    ? positive
    : triggerContributions(contributions).filter((item) => item.effectiveWeight > 0);
  return source.reduce<BriefSpec["openers"]>((openers, contribution) => {
    openers[contribution.type] = openerText(contribution.type);
    return openers;
  }, {});
}

function strongestSignal(contributions: BriefContribution[]): BriefContribution {
  const triggers = triggerContributions(contributions);
  return [...triggers].sort(byStrengthDesc)[0] ?? {
    type: "funding",
    rawScore: 0,
    effectiveWeight: 1,
    daysAgo: null,
    observedAt: null,
    summary: "No trigger signal yet",
    contribution: 0,
    status: "no_signal",
  };
}

function weakestSignals(contributions: BriefContribution[]): BriefContribution[] {
  const triggers = triggerContributions(contributions);
  const source = triggers.length > 0
    ? triggers
    : [
        strongestSignal([]),
        { ...strongestSignal([]), type: "hiring" as const, summary: "No hiring signal yet" },
      ];
  return [...source].sort(byStrengthAsc).slice(0, 2);
}

function nextSteps(): BriefSection {
  return {
    type: "next_steps",
    actions: [
      {
        label: "Draft outreach",
        prompt: "Write a concise outreach email to {persona} at {company} using the {angle} angle.",
      },
      {
        label: "Explain timing",
        prompt: "Explain why {company} is {band} now and what changes if outreach waits.",
      },
    ],
  };
}

function defaultAngle(openers: BriefSpec["openers"], strongest: TriggerKey): TriggerKey {
  return openers[strongest] ? strongest : (Object.keys(openers)[0] as TriggerKey | undefined) ?? strongest;
}

export function buildFallbackBrief(input: {
  company: string;
  score: number;
  band: ScoreBand;
  contributions: BriefContribution[];
}): BriefSpec {
  const strongest = strongestSignal(input.contributions);
  const openers = buildOpeners(input.contributions);
  const angle = defaultAngle(openers, strongest.type);
  const opener: BriefSection = {
    type: "opener_picker",
    default_angle: angle,
    default_persona: DEFAULT_PERSONAS[0],
  };
  const timing: BriefSection = {
    type: "timing_slider",
    note: "{company} is {band} at {score}; use the slider to compare waiting with acting now.",
  };
  const whyNow: BriefSection = {
    type: "why_now",
    text: "{company} is {band} because {signal." + strongest.type + ".detail} is contributing {signal." + strongest.type + ".points} points.",
  };
  const spotlight: BriefSection = {
    type: "signal_spotlight",
    signal: strongest.type,
    take: "This is the strongest current angle for {company}: lead with it before it ages out.",
  };
  const whatWouldChange: BriefSection = {
    type: "what_would_change",
    items: weakestSignals(input.contributions).map((item) => ({
      signal: item.type,
      if: "Fresh evidence appears around {signal." + item.type + ".detail}",
    })),
  };

  const base = {
    version: 1 as const,
    headline: `${input.company} is ${input.band} for timely outreach`,
    personas: [...DEFAULT_PERSONAS],
    openers,
  };

  if (input.band === "HOT") {
    return { ...base, layout: [{ type: "score_hero" }, whyNow, opener, timing, nextSteps()] };
  }
  if (input.band === "WARM") {
    return { ...base, layout: [{ type: "score_hero" }, timing, spotlight, opener, nextSteps()] };
  }
  return { ...base, layout: [{ type: "score_hero" }, whatWouldChange, timing, nextSteps()] };
}
