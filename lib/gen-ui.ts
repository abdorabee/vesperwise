import type { ScoreBand, SignalContribution, SignalResult, SignalSet } from "@/lib/types";
import { briefContributionsFrom, buildFallbackBrief, repairBrief, type BriefSpec } from "./brief";
import { repairUiBlocks } from "./gen-ui-repair";
import type { SignalAxis, UiBlock, UiSuggestion } from "./gen-ui-schemas";

export {
  signalAxisSchema,
  UI_BLOCK_SCHEMAS,
  uiBlockListSchema,
  uiBlockSchema,
} from "./gen-ui-schemas";
export type { SignalAxis, UiBlock, UiSuggestion } from "./gen-ui-schemas";

const AXIS_META: Record<string, { label: string; context?: boolean }> = {
  funding: { label: "Funding" },
  hiring: { label: "Hiring" },
  news: { label: "News" },
  technology: { label: "Tech" },
  web: { label: "Web authority", context: true },
  github: { label: "GitHub activity", context: true },
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function firstSourceUrl(sig: SignalResult, contribution?: SignalContribution): string | undefined {
  const candidates = [
    ...(sig.evidence ?? []).map((item) => item.source_url),
    ...(contribution?.sourceUrls ?? []),
  ];
  return candidates.find(isHttpUrl);
}

export function signalAxesFromSet(signals: SignalSet, contributions: SignalContribution[] = []): SignalAxis[] {
  const keys = ["funding", "hiring", "news", "technology", "web", "github"] as const;
  const byType = new Map(contributions.map((item) => [item.type as string, item]));
  return keys.flatMap((key) => {
    const sig = signals[key];
    if (!sig) return [];
    const meta = AXIS_META[key];
    const contribution = byType.get(key);
    const axis: SignalAxis = {
      key,
      label: meta.label,
      score: sig.score,
      max: sig.max,
      detail: sig.status === "unavailable" || sig.status === "not_found" ? "Unavailable" : sig.detail,
      observed_at: sig.observed_at ?? null,
      source: sig.source,
      context: meta.context,
    };
    const url = firstSourceUrl(sig, contribution);
    if (url) axis.source_url = url;
    if (contribution && !meta.context) {
      axis.contribution = Math.round(contribution.contribution * 10) / 10;
      axis.days_ago = contribution.daysAgo;
      axis.freshness = contribution.freshness;
    }
    return [axis];
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
  contributions?: SignalContribution[];
  brief?: BriefSpec;
  last_updated?: string;
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
  const briefContributions = score.contributions ? briefContributionsFrom(score.contributions).slice(0, 6) : [];
  const availableSignals = briefContributions.map((item) => item.type);
  const repairedBrief = score.brief
    ? repairBrief(score.brief, { availableSignals }).spec
    : null;
  const livingBrief = briefContributions.length > 0
    ? {
        type: "living_brief" as const,
        company: score.company,
        domain: score.domain,
        intent_score: score.intent_score,
        score_band: score.score_band,
        last_updated: score.last_updated,
        data_coverage: score.data_coverage,
        spec: repairedBrief ?? buildFallbackBrief({
          company: score.company,
          score: score.intent_score,
          band: score.score_band,
          contributions: briefContributions,
        }),
        contributions: briefContributions,
      }
    : null;

  const blocks: UiBlock[] = livingBrief ? [livingBrief] : [
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
      last_updated: score.last_updated,
    },
  ];

  if (score.signals) {
    const axes = signalAxesFromSet(score.signals, score.contributions);
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

  if (!livingBrief && score.ai_summary) {
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

export function sanitizeUiBlocks(input: unknown, allowedDomains?: string[]): UiBlock[] {
  return repairUiBlocks(input, allowedDomains).blocks;
}

export function suggestionsFromBlocks(blocks: UiBlock[]): UiSuggestion[] {
  const rail = [...blocks].reverse().find((b) => b.type === "action_rail");
  return rail?.type === "action_rail" ? rail.suggestions ?? [] : [];
}
