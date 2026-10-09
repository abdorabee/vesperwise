import type { ScoreBand } from "../types";
import { TRIGGER_KEYS, type TriggerKey } from "./brief-schema";
import type { BriefContribution } from "./brief-data";

export interface BriefContext {
  company: string;
  score: number;
  band: ScoreBand;
  contributions: BriefContribution[];
  angle?: TriggerKey;
  persona?: string;
}

const SIGNAL_REF = /^signal\.(funding|hiring|news|technology)\.(detail|days_ago|points)$/;

export function interpolate(text: string, ctx: BriefContext): { text: string; unknownRefs: string[] } {
  const unknown = new Set<string>();
  const bySignal = new Map<TriggerKey, BriefContribution>(
    ctx.contributions.filter((item) => (TRIGGER_KEYS as readonly string[]).includes(item.type)).map((item) => [item.type, item]),
  );
  const rendered = text.replace(/\{([^{}]+)\}/g, (_match, rawRef: string) => {
    const ref = rawRef.trim();
    if (ref === "score") return String(ctx.score);
    if (ref === "band") return ctx.band;
    if (ref === "company") return ctx.company;
    if (ref === "angle" && ctx.angle) return ctx.angle;
    if (ref === "persona" && ctx.persona) return ctx.persona;

    const signal = SIGNAL_REF.exec(ref);
    if (signal) {
      const key = signal[1] as TriggerKey;
      const field = signal[2];
      const contribution = bySignal.get(key);
      if (contribution) {
        if (field === "detail") return contribution.summary;
        if (field === "days_ago" && typeof contribution.daysAgo === "number") {
          return String(Math.round(contribution.daysAgo));
        }
        if (field === "points") return String(Math.round(contribution.contribution));
      }
    }

    unknown.add(ref);
    return "";
  });

  return { text: rendered, unknownRefs: [...unknown] };
}
