import type { SignalContribution, SignalStatus } from "../types";
import { TRIGGER_KEYS, type TriggerKey } from "./brief-schema";

export interface BriefContribution {
  type: TriggerKey;
  rawScore: number;
  effectiveWeight: number;
  daysAgo: number | null;
  halfLifeDays?: number;
  observedAt: string | null;
  summary: string;
  contribution: number;
  status?: SignalStatus;
}

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
