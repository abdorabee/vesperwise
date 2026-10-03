import type { UiBlock } from "@/lib/gen-ui";
import type { IncompleteCoverageResult } from "@/lib/score-coverage";
import type { ToolChip } from "@/lib/score-presentation";
import type { ScoreFailure } from "@/components/score/score-error-card";
import type { ScoreResearchProgress } from "@/components/score/score-research-status";

export type ThreadMessage =
  | { id: string; role: "user"; content: string; restored?: boolean }
  | { id: string; role: "assistant"; kind: "ui"; blocks: UiBlock[]; content: string; tools: ToolChip[]; billing?: string; restored?: boolean; stored?: { domain: string; createdAt: string } }
  | { id: string; role: "assistant"; kind: "text"; content: string; tools: ToolChip[]; restored?: boolean }
  | { id: string; role: "assistant"; kind: "coverage"; result: IncompleteCoverageResult }
  | { id: string; role: "assistant"; kind: "thinking"; mode: "score" | "chat"; tools: ToolChip[]; progress?: ScoreResearchProgress; domain?: string }
  | { id: string; role: "error"; content: string; failure?: ScoreFailure; domain?: string };

export type ScoreUiThreadMessage = Extract<ThreadMessage, { role: "assistant"; kind: "ui" }>;
