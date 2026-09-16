import { z } from "zod";
import type { ScoreBand, SignalSet } from "@/lib/types";

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

const AXIS_META: Record<string, { label: string; context?: boolean }> = {
  funding: { label: "Funding" },
  hiring: { label: "Hiring" },
  news: { label: "News" },
  technology: { label: "Tech" },
  web: { label: "Web authority", context: true },
  github: { label: "GitHub activity", context: true },
};

export function signalAxesFromSet(signals: SignalSet): SignalAxis[] {
  const keys = ["funding", "hiring", "news", "technology", "web", "github"] as const;
  return keys.flatMap((key) => {
    const sig = signals[key];
    if (!sig) return [];
    const meta = AXIS_META[key];
    return [{
      key,
      label: meta.label,
      score: sig.score,
      max: sig.max,
      detail: sig.status === "unavailable" || sig.status === "not_found" ? "Unavailable" : sig.detail,
      observed_at: sig.observed_at ?? null,
      source: sig.source,
      context: meta.context,
    }];
  });
}

export type WorkspaceScore = {
  company: string;
  domain: string;
  intent_score: number;
  score_band: ScoreBand;
  ai_summary?: string;
  recommended_action?: string;
  buying_stage?: string;
  urgency?: string;
  why_now?: string;
  data_coverage?: number;
  score_status?: string;
  icp_fit_score?: number | null;
  email_subject?: string;
  talk_track?: string;
  signals?: SignalSet;
};

export function defaultSuggestions(score: { company: string; score_band: string }): UiSuggestion[] {
  return [
    {
      label: `Why ${score.score_band}?`,
      prompt: `Why is ${score.company} ${score.score_band}? What evidence matters most, and what would move the score?`,
    },
    {
      label: "Draft outreach",
      prompt: `Draft a personalized outreach email for ${score.company}`,
    },
    {
      label: "Who to call",
      prompt: `Who should I talk to at ${score.company} and what's the angle?`,
    },
  ];
}

export function workspaceFromScore(score: WorkspaceScore): UiBlock[] {
  const blocks: UiBlock[] = [
    {
      type: "intent_hero",
      company: score.company,
      domain: score.domain,
      intent_score: score.intent_score,
      score_band: score.score_band,
      buying_stage: score.buying_stage,
      urgency: score.urgency,
      data_coverage: score.data_coverage,
      score_status: score.score_status,
      icp_fit_score: score.icp_fit_score,
    },
  ];

  if (score.signals) {
    const axes = signalAxesFromSet(score.signals);
    if (axes.length > 0) {
      const weakest = axes
        .filter((a) => !a.context)
        .slice()
        .sort((a, b) => a.score / a.max - b.score / b.max)[0];
      blocks.push({
        type: "signal_explorer",
        selected_key: weakest?.key,
        axes,
      });
    }
  }

  if (score.ai_summary) {
    blocks.push({
      type: "thesis",
      summary: score.ai_summary,
      urgency: score.urgency,
      recommended_action: score.recommended_action,
      why_now: score.why_now,
    });
  }

  if (score.email_subject || score.talk_track) {
    blocks.push({
      type: "outreach_studio",
      company: score.company,
      subject: score.email_subject,
      talk_track: score.talk_track,
    });
  }

  blocks.push({
    type: "action_rail",
    company: score.company,
    domain: score.domain,
    suggestions: defaultSuggestions(score),
  });

  return blocks;
}

function extractBlocksInput(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (Array.isArray(record.blocks)) return record.blocks;
  }
  return [];
}

function domainOf(block: UiBlock): string | undefined {
  if (block.type === "intent_hero" || block.type === "action_rail") return block.domain.toLowerCase();
  return undefined;
}

export function sanitizeUiBlocks(input: unknown, allowedDomains?: string[]): UiBlock[] {
  const allowed = allowedDomains?.map((d) => d.toLowerCase());
  const out: UiBlock[] = [];

  for (const item of extractBlocksInput(input)) {
    const parsed = uiBlockSchema.safeParse(item);
    if (!parsed.success) continue;
    let block = parsed.data;

    if (allowed && allowed.length > 0) {
      const domain = domainOf(block);
      if (domain && !allowed.includes(domain)) continue;
      if (block.type === "comparison") {
        const accounts = block.accounts.filter((a) => allowed.includes(a.domain.toLowerCase()));
        if (accounts.length < 2) continue;
        block = { ...block, accounts };
      }
    }

    if (block.type === "action_rail" && block.suggestions?.length) {
      block = {
        ...block,
        suggestions: block.suggestions.map((s) => ({ label: s.label, prompt: s.label })),
      };
    }

    out.push(block);
    if (out.length >= 12) break;
  }

  return out;
}

export function suggestionsFromBlocks(blocks: UiBlock[]): UiSuggestion[] {
  const rail = [...blocks].reverse().find((b) => b.type === "action_rail");
  return rail?.type === "action_rail" ? rail.suggestions ?? [] : [];
}
