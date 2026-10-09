import type { UiBlock } from "@/lib/gen-ui";
import type { BriefContext, TriggerKey } from "@/lib/brief";
import type { ScoreBand } from "@/lib/types";

export type LivingBriefBlock = Extract<UiBlock, { type: "living_brief" }>;

export type BriefProjection = {
  score: number;
  band: ScoreBand;
  perSignal: Record<TriggerKey, number>;
};

export type LivingBriefHandlers = {
  onPrompt?: (prompt: string) => void;
  pending?: boolean;
};

export type BriefSharedState = {
  /** Days between scoring and now; added to every signal age. */
  elapsedDays: number;
  offsetDays: number;
  setOffsetDays: (days: number) => void;
  angle?: TriggerKey;
  setAngle: (angle: TriggerKey) => void;
  persona?: string;
  setPersona: (persona: string) => void;
};

export type BriefSectionProps = {
  block: LivingBriefBlock;
  ctx: BriefContext;
  projected: BriefProjection;
  /** The score as of right now (stored score decayed by elapsedDays). */
  now: BriefProjection;
  displayScore: number;
  displayBand: ScoreBand;
  fresh: boolean;
  handlers: LivingBriefHandlers;
  state: BriefSharedState;
};
