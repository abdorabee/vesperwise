import type { UiBlock } from "@/lib/gen-ui";
import type { BriefSpec } from "@/lib/brief";
import type { IncompleteCoverageResult } from "@/lib/score-coverage";
import type { ScoreProgressEvent } from "@/lib/score-progress";
import type { ToolChip } from "@/lib/score-presentation";
import type { ScoreFailure } from "@/components/score/score-error-card";
import type { ScoreResearchProgress } from "@/components/score/score-research-status";
import type { SandboxToolContent, SandboxToolData } from "@/components/score/sandbox-tool/renderer";

export type ScoreReadyProgress = Extract<ScoreProgressEvent, { type: "score_ready" }>;

export interface ThreadWidget {
  id: string;
  content: SandboxToolContent;
  data?: SandboxToolData;
  dataReady: boolean;
}

export type ThreadMessage =
  | { id: string; role: "user"; content: string; restored?: boolean }
  | { id: string; role: "assistant"; kind: "ui"; blocks: UiBlock[]; content: string; tools: ToolChip[]; widgets?: ThreadWidget[]; billing?: string; restored?: boolean; stored?: { domain: string; createdAt: string } }
  | { id: string; role: "assistant"; kind: "text"; content: string; tools: ToolChip[]; widgets?: ThreadWidget[]; restored?: boolean }
  | { id: string; role: "assistant"; kind: "coverage"; result: IncompleteCoverageResult }
  | { id: string; role: "assistant"; kind: "thinking"; mode: "score" | "chat"; tools: ToolChip[]; widgets?: ThreadWidget[]; progress?: ScoreResearchProgress; domain?: string; score?: ScoreReadyProgress; brief?: BriefSpec }
  | { id: string; role: "error"; content: string; failure?: ScoreFailure; domain?: string };

export type ScoreUiThreadMessage = Extract<ThreadMessage, { role: "assistant"; kind: "ui" }>;
