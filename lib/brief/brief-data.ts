import { z } from "zod";

import type { SignalContribution, SignalStatus } from "../types";
import { TRIGGER_KEYS, triggerKeySchema, type TriggerKey } from "./brief-schema";

export const briefContributionSchema = z.object({
  type: triggerKeySchema,
  rawScore: z.number(),
  effectiveWeight: z.number(),
  daysAgo: z.number().nullable(),
  halfLifeDays: z.number().optional(),
  observedAt: z.string().max(80).nullable(),
  summary: z.string().max(400),
  contribution: z.number(),
  status: z.enum(["ok", "no_signal", "stale", "not_found", "unavailable"]).optional(),
});

export type BriefContribution = z.infer<typeof briefContributionSchema> & { status?: SignalStatus };

const TRIGGER_KEY_SET = new Set<string>(TRIGGER_KEYS);

function isTriggerKey(value: string): value is TriggerKey {
  return TRIGGER_KEY_SET.has(value);
}

export function briefContributionsFrom(contributions: SignalContribution[]): BriefContribution[] {
  return contributions
    .filter((item): item is SignalContribution & { type: TriggerKey } => isTriggerKey(item.type))
    .map((item) => ({
      type: item.type,
      rawScore: item.rawScore,
      effectiveWeight: item.effectiveWeight,
      daysAgo: item.daysAgo,
      ...(item.halfLifeDays === undefined ? {} : { halfLifeDays: item.halfLifeDays }),
      observedAt: item.observedAt,
      summary: item.summary,
      contribution: item.contribution,
      ...(item.status === undefined ? {} : { status: item.status }),
    }));
}
