"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { SandboxToolRenderer } from "@/components/score/sandbox-tool/renderer";
import { createSandboxFunctions } from "@/components/score/sandbox-tool/sandbox-functions";
import { ScoreCoverageIncomplete } from "@/components/score/score-coverage-incomplete";
import { ScoreErrorCard } from "@/components/score/score-error-card";
import { ScoreResultCard } from "@/components/score/score-result-card";
import { ScoreResearchStatus } from "@/components/score/score-research-status";
import type { ScoreReport } from "@/components/score/score-report-model";
import type { ScoreUiThreadMessage, ThreadMessage, ThreadWidget } from "@/components/score/score-thread-types";
import { toolLabel, ToolTrace } from "@/components/score/tool-trace";

function MessageWidgets({
  functions,
  widgets,
}: {
  functions: ReturnType<typeof createSandboxFunctions>;
  widgets?: ThreadWidget[];
}) {
  if (!widgets || widgets.length === 0) return null;
  return (
    <div className="w-full space-y-3">
      {widgets.map((widget) => (
        <SandboxToolRenderer
          key={widget.id}
          content={widget.content}
          data={widget.data}
          dataReady={widget.dataReady}
          functions={functions}
        />
      ))}
    </div>
  );
}

export function ScoreConversationThread({
  messages,
  latestArtifactId,
  activeStreamingMessageId,
  allowedDomains,
  reportForMessage,
  onPrefillPrompt,
  onOpenAccount,
  onOpenReport,
  onRetryScore,
  onReset,
}: {
  messages: ThreadMessage[];
  latestArtifactId?: string;
  activeStreamingMessageId: string | null;
  allowedDomains: readonly string[];
  reportForMessage: (message: ScoreUiThreadMessage) => Extract<ScoreReport, { kind: "ui" }>;
  onPrefillPrompt: (text: string) => void;
  onOpenAccount: (domain: string) => void;
  onOpenReport: (report: Extract<ScoreReport, { kind: "ui" }>) => void;
  onRetryScore: (domain: string) => void;
  onReset: () => void;
}) {
  const allowedDomainsKey = allowedDomains.join("\n");
  const stableAllowedDomains = useMemo(() => allowedDomainsKey ? allowedDomainsKey.split("\n") : [], [allowedDomainsKey]);
  const sandboxFunctions = useMemo(() => createSandboxFunctions({
    allowedDomains: stableAllowedDomains,
    onOpenAccount,
    onPrefillPrompt,
  }), [stableAllowedDomains, onOpenAccount, onPrefillPrompt]);

  return (
    <Conversation className="score-chat-thread">
      <ConversationContent className="score-chat-col">
        {messages.map((message) => {
          if (message.role === "user") return <div key={message.id} className="score-message score-message-user score-user-bubble-in ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-5 text-foreground" data-motion={message.restored ? "restored" : "submitted"}>{message.content}</div>;
          if (message.role === "error") {
            if (message.failure) return <div key={message.id} className="score-message"><ScoreErrorCard failure={message.failure} domain={message.domain} onRetry={onRetryScore} onReset={onReset} /></div>;
            return <div key={message.id} className="score-message flex items-start gap-2 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message.content}</div>;
          }
          if (message.kind === "thinking") {
            const running = message.tools.findLast((tool) => tool.status === "running");
            const thinkingLabel = running ? `Using ${toolLabel(running.name)}…` : "Thinking…";
            return <div key={message.id} className="score-message space-y-2"><ScoreResearchStatus mode={message.mode} progress={message.progress} label={message.mode === "chat" ? thinkingLabel : undefined} />{message.mode === "chat" ? <ToolTrace tools={message.tools} /> : null}</div>;
          }
          if (message.kind === "coverage") {
            const artifact = <ScoreCoverageIncomplete result={message.result} onRetry={onRetryScore} onReset={onReset} />;
            if (message.id !== latestArtifactId) {
              return <details key={message.id} className="score-artifact-archive rounded-lg border border-border/70 bg-muted/20"><summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">{message.result.domain} · coverage incomplete</summary><div className="border-t border-border/70 p-4">{artifact}</div></details>;
            }
            return <div key={message.id} className="score-message" data-motion="generated">{artifact}</div>;
          }
          if (message.kind === "ui") {
            const report = reportForMessage(message);
            return <div key={message.id} className="score-message space-y-4"><ToolTrace tools={message.tools} billing={message.billing} />{message.content ? <MessageResponse streaming={message.id === activeStreamingMessageId} className="text-sm leading-6 text-foreground/85">{message.content}</MessageResponse> : null}<MessageWidgets widgets={message.widgets} functions={sandboxFunctions} /><ScoreResultCard report={report} onView={() => onOpenReport(report)} /></div>;
          }
          return <div key={message.id} className="score-message space-y-3"><ToolTrace tools={message.tools} />{message.content ? <MessageResponse streaming={message.id === activeStreamingMessageId} className="text-sm leading-6 text-foreground/85">{message.content}</MessageResponse> : null}<MessageWidgets widgets={message.widgets} functions={sandboxFunctions} /></div>;
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
