import type { UiBlock } from "@/lib/gen-ui";
import type { BriefSpec } from "@/lib/brief";
import type { ScoreResearchProgress } from "@/components/score/score-research-status";
import type { ScoreReadyProgress } from "@/components/score/score-thread-types";
import type { ScoreBand } from "@/lib/types";

type UiMessageSource = {
  id: string;
  role: "assistant";
  kind: "ui";
  blocks: UiBlock[];
  restored?: boolean;
  stored?: { domain: string; createdAt: string };
};

type ThinkingMessageSource = {
  id: string;
  role: "assistant";
  kind: "thinking";
  mode: "score" | "chat";
  domain?: string;
  progress?: ScoreResearchProgress;
  score?: ScoreReadyProgress;
  brief?: BriefSpec;
};

export type ScoreReportSource = UiMessageSource | ThinkingMessageSource;

export type ScoreReport =
  | {
      kind: "ui";
      id: string;
      messageId: string;
      label: string;
      blocks: UiBlock[];
      company?: string;
      domain?: string;
      score?: number;
      band?: ScoreBand;
      restored?: boolean;
      fresh: boolean;
      stored?: { domain: string; createdAt: string };
    }
  | {
      kind: "pending";
      id: string;
      messageId: string;
      label: string;
      company?: string;
      domain: string;
      progress?: ScoreResearchProgress;
      score?: ScoreReadyProgress;
      brief?: BriefSpec;
    };

export function heroBlock(blocks: UiBlock[]) {
  return blocks.find((block): block is Extract<UiBlock, { type: "living_brief" | "intent_hero" }> =>
    block.type === "living_brief" || block.type === "intent_hero"
  );
}

export function artifactLabel(blocks: UiBlock[]) {
  const hero = heroBlock(blocks);
  if (hero) return `${hero.company} · ${hero.intent_score} ${hero.score_band}`;
  if (blocks.some((block) => block.type === "comparison")) return "Account comparison";
  if (blocks.some((block) => block.type === "outreach_studio")) return "Outreach draft";
  return "Earlier result";
}

function actionRailBlock(blocks: UiBlock[]) {
  return blocks.find((block): block is Extract<UiBlock, { type: "action_rail" }> => block.type === "action_rail");
}

function outreachBlock(blocks: UiBlock[]) {
  return blocks.find((block): block is Extract<UiBlock, { type: "outreach_studio" }> => block.type === "outreach_studio");
}

export function buildScoreReport(
  id: string,
  blocks: UiBlock[],
  options: { current: boolean; restored?: boolean; stored?: { domain: string; createdAt: string } },
): Extract<ScoreReport, { kind: "ui" }> {
  const hero = heroBlock(blocks);
  const action = actionRailBlock(blocks);
  const outreach = outreachBlock(blocks);
  const domain = hero?.domain ?? action?.domain ?? options.stored?.domain;
  const company = hero?.company ?? action?.company ?? outreach?.company;
  return {
    kind: "ui",
    id,
    messageId: id,
    label: artifactLabel(blocks),
    blocks,
    company,
    domain,
    score: hero?.intent_score,
    band: hero?.score_band,
    restored: options.restored,
    fresh: options.current && !options.restored,
    stored: options.stored,
  };
}

function buildPendingReport(message: ThinkingMessageSource): ScoreReport | null {
  if (message.mode !== "score" || !message.domain) return null;
  return {
    kind: "pending",
    id: message.id,
    messageId: message.id,
    label: message.score?.company ?? message.domain,
    company: message.score?.company ?? message.domain,
    domain: message.domain,
    progress: message.progress,
    score: message.score,
    brief: message.brief,
  };
}

function reportKey(report: ScoreReport) {
  return report.domain ? `domain:${report.domain.toLowerCase()}` : `message:${report.id}`;
}

export function buildScoreReports(messages: ScoreReportSource[]): ScoreReport[] {
  const latestUiId = messages.findLast((message) => message.kind === "ui")?.id;
  const reportsByKey = new Map<string, ScoreReport>();

  for (const message of messages) {
    const report = message.kind === "ui"
      ? buildScoreReport(message.id, message.blocks, {
        current: message.id === latestUiId,
        restored: message.restored,
        stored: message.stored,
      })
      : buildPendingReport(message);
    if (!report) continue;
    const key = reportKey(report);
    if (reportsByKey.has(key)) reportsByKey.delete(key);
    reportsByKey.set(key, report);
  }

  return [...reportsByKey.values()];
}

export function latestReportId(reports: ScoreReport[]) {
  return reports.at(-1)?.id ?? null;
}

export function getNextCompanyTabIndex(current: number, total: number, key: string) {
  if (total <= 0) return current;
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % total;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + total) % total;
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  return current;
}
