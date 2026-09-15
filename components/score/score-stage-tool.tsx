"use client";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import type { GenUiHandlers } from "@/components/score/gen-ui/workspace";
import type { UiBlock } from "@/lib/gen-ui";
import { cn } from "@/lib/utils";

export const SCORE_STAGE_ORDER = ["domain", "signals", "score", "action"] as const;
export type ScoreStageKey = (typeof SCORE_STAGE_ORDER)[number];

export const SCORE_STAGE_LABELS: Record<ScoreStageKey, string> = {
  domain: "resolve_domain",
  signals: "gather_signals",
  score: "compute_intent",
  action: "next_action",
};

export const SCORE_STAGE_TITLES: Record<ScoreStageKey, string> = {
  domain: "Resolve domain",
  signals: "Gather signals",
  score: "Compute intent",
  action: "Next action",
};

export type ScoreStageToolState = {
  stage: ScoreStageKey;
  status: "running" | "done" | "error";
  input?: Record<string, unknown>;
  block?: UiBlock | null;
  errorText?: string;
  open?: boolean;
};

export function nextScoreStage(stage: ScoreStageKey): ScoreStageKey | null {
  const idx = SCORE_STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= SCORE_STAGE_ORDER.length - 1) return null;
  return SCORE_STAGE_ORDER[idx + 1];
}

export function ScoreStageToolRow({
  tool,
  handlers,
  className,
}: {
  tool: ScoreStageToolState;
  handlers?: GenUiHandlers;
  className?: string;
}) {
  const state =
    tool.status === "running"
      ? "input-available"
      : tool.status === "error"
        ? "output-error"
        : "output-available";

  return (
    <Tool
      defaultOpen={tool.open ?? true}
      className={cn("mb-0 overflow-hidden rounded-lg border shadow-none", className)}
    >
      <ToolHeader
        className="px-3 py-2"
        title={SCORE_STAGE_TITLES[tool.stage]}
        type={`tool-${SCORE_STAGE_LABELS[tool.stage]}`}
        state={state}
      />
      <ToolContent className="space-y-3 p-3 pt-0">
        {tool.input ? <ToolInput input={tool.input} className="space-y-1.5" /> : null}
        <ToolOutput
          output={
            tool.block ? (
              <GenUiWorkspace blocks={[tool.block]} handlers={handlers ?? {}} />
            ) : tool.status === "running" ? (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Running…
              </div>
            ) : null
          }
          errorText={tool.errorText}
        />
      </ToolContent>
    </Tool>
  );
}
