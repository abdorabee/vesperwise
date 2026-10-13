import { z } from "zod";

const scoreBandSchema = z.enum(["HOT", "WARM", "COLD"]);

const suggestionSchema = z.object({
  label: z.string().min(1).max(80),
  prompt: z.string().min(1).max(280),
});

export const signalAxisSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  score: z.number(),
  max: z.number().positive(),
  detail: z.string().max(2000).optional(),
  observed_at: z.string().max(80).nullable().optional(),
  source: z.string().max(80).optional(),
  context: z.boolean().optional(),
  /** First http(s) evidence URL for this signal, when the provider supplied one. */
  source_url: z.string().url().max(2000).optional(),
  /** Age of the observed evidence in days at scoring time. */
  days_ago: z.number().nullable().optional(),
  /** Points this signal added to the final score (trigger signals only). */
  contribution: z.number().optional(),
  /** Freshness multiplier 0-1 applied for evidence age. */
  freshness: z.number().optional(),
});

const intentHeroSchema = z.object({
  type: z.literal("intent_hero"),
  company: z.string().min(1).max(120),
  domain: z.string().min(1).max(200),
  intent_score: z.number(),
  score_band: scoreBandSchema,
  buying_stage: z.string().max(40).optional(),
  urgency: z.string().max(40).optional(),
  data_coverage: z.number().optional(),
  score_status: z.string().max(40).optional(),
  icp_fit_score: z.number().nullable().optional(),
  /** When the score was computed (drives "Fetched N min ago"). */
  last_updated: z.string().max(80).optional(),
});

const signalExplorerSchema = z.object({
  type: z.literal("signal_explorer"),
  selected_key: z.string().max(40).optional(),
  axes: z.array(signalAxisSchema).min(1).max(8),
});

const thesisSchema = z.object({
  type: z.literal("thesis"),
  summary: z.string().min(1).max(4000),
  urgency: z.string().max(40).optional(),
  recommended_action: z.string().max(500).optional(),
  why_now: z.string().max(2000).optional(),
});

const outreachStudioSchema = z.object({
  type: z.literal("outreach_studio"),
  company: z.string().max(120).optional(),
  subject: z.string().max(200).optional(),
  talk_track: z.string().max(4000).optional(),
});

const actionRailSchema = z.object({
  type: z.literal("action_rail"),
  company: z.string().min(1).max(120),
  domain: z.string().min(1).max(200),
  suggestions: z.array(suggestionSchema).max(6).optional(),
});

const comparisonAccountSchema = z.object({
  company: z.string().min(1).max(120),
  domain: z.string().min(1).max(200),
  intent_score: z.number(),
  score_band: scoreBandSchema,
  axes: z.array(z.object({
    key: z.string().min(1).max(40),
    score: z.number(),
    max: z.number().positive(),
  })).max(6).optional(),
});

const comparisonSchema = z.object({
  type: z.literal("comparison"),
  accounts: z.array(comparisonAccountSchema).min(2).max(4),
});

const markdownSchema = z.object({
  type: z.literal("markdown"),
  text: z.string().min(1).max(4000),
});

export const uiBlockSchema = z.discriminatedUnion("type", [
  intentHeroSchema,
  signalExplorerSchema,
  thesisSchema,
  outreachStudioSchema,
  actionRailSchema,
  comparisonSchema,
  markdownSchema,
]);

export const uiBlockListSchema = z.array(uiBlockSchema).max(12);

export type UiBlock = z.infer<typeof uiBlockSchema>;
export type SignalAxis = z.infer<typeof signalAxisSchema>;
export type UiSuggestion = z.infer<typeof suggestionSchema>;

export const UI_BLOCK_SCHEMAS: Record<UiBlock["type"], z.ZodObject> = {
  intent_hero: intentHeroSchema,
  signal_explorer: signalExplorerSchema,
  thesis: thesisSchema,
  outreach_studio: outreachStudioSchema,
  action_rail: actionRailSchema,
  comparison: comparisonSchema,
  markdown: markdownSchema,
};
