import { z } from "zod";

import type { CoreIntentSignalKey } from "../types";

export const TRIGGER_KEYS = ["funding", "hiring", "news", "technology"] as const satisfies readonly CoreIntentSignalKey[];
export const triggerKeySchema = z.enum(TRIGGER_KEYS);
export type TriggerKey = CoreIntentSignalKey;

const scoreHeroSectionSchema = z.object({
  type: z.literal("score_hero"),
});

const whyNowSectionSchema = z.object({
  type: z.literal("why_now"),
  text: z.string().min(1).max(900),
});

const timingSliderSectionSchema = z.object({
  type: z.literal("timing_slider"),
  note: z.string().min(1).max(200).optional(),
});

const signalSpotlightSectionSchema = z.object({
  type: z.literal("signal_spotlight"),
  signal: triggerKeySchema,
  take: z.string().min(1).max(400),
});

const whatWouldChangeItemSchema = z.object({
  signal: triggerKeySchema,
  if: z.string().min(1).max(160),
});

const whatWouldChangeSectionSchema = z.object({
  type: z.literal("what_would_change"),
  items: z.array(whatWouldChangeItemSchema).min(1).max(3),
});

const openerPickerSectionSchema = z.object({
  type: z.literal("opener_picker"),
  default_angle: triggerKeySchema,
  default_persona: z.string().min(1).max(40),
});

const nextStepActionSchema = z.object({
  label: z.string().min(1).max(40),
  prompt: z.string().min(1).max(400),
});

const nextStepsSectionSchema = z.object({
  type: z.literal("next_steps"),
  actions: z.array(nextStepActionSchema).min(1).max(3),
});

export const briefSectionSchema = z.discriminatedUnion("type", [
  scoreHeroSectionSchema,
  whyNowSectionSchema,
  timingSliderSectionSchema,
  signalSpotlightSectionSchema,
  whatWouldChangeSectionSchema,
  openerPickerSectionSchema,
  nextStepsSectionSchema,
]);

export const briefSpecSchema = z.object({
  version: z.literal(1),
  headline: z.string().max(140),
  layout: z.array(briefSectionSchema).min(1).max(6),
  personas: z.array(z.string().min(1).max(40)).min(1).max(3),
  openers: z.partialRecord(
    triggerKeySchema,
    z.record(z.string().min(1).max(40), z.string().min(1).max(400)),
  ),
});

export type BriefSection = z.infer<typeof briefSectionSchema>;
export type BriefSpec = z.infer<typeof briefSpecSchema>;
export type BriefOpenerMap = BriefSpec["openers"];
export type BriefNextStepAction = z.infer<typeof nextStepActionSchema>;

export const BRIEF_SECTION_SCHEMAS: Record<BriefSection["type"], z.ZodObject> = {
  score_hero: scoreHeroSectionSchema,
  why_now: whyNowSectionSchema,
  timing_slider: timingSliderSectionSchema,
  signal_spotlight: signalSpotlightSectionSchema,
  what_would_change: whatWouldChangeSectionSchema,
  opener_picker: openerPickerSectionSchema,
  next_steps: nextStepsSectionSchema,
};
