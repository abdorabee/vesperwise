"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import type { IntentScore, ScoreBand } from "@/lib/types";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { extractDomain, seedChatSession, streamChat, streamScore } from "@/lib/chat-client";
import type { ScoreStreamEvent } from "@/lib/chat-client";
import { BandBadge, avColor, scoreFromToolResult } from "@/components/score/score-result-card";
import type { ScoreCardData } from "@/components/score/score-result-card";
import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import {
  ScoreStageToolRow,
  SCORE_STAGE_TITLES,
  nextScoreStage,
  type ScoreStageKey,
  type ScoreStageToolState,
} from "@/components/score/score-stage-tool";
import { blockFromScoreStage, defaultSuggestions, sanitizeUiBlocks, suggestionsFromBlocks, workspaceFromScore } from "@/lib/gen-ui";
import type { UiBlock } from "@/lib/gen-ui";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ScorableIntentScore = IntentScore & {
  intent_score: number;
  score_band: ScoreBand;
};

function requireScorableResult(value: IntentScore): ScorableIntentScore {
  if (value.intent_score === null || value.score_band === null || value.score_status === "unscorable") {
    throw new Error("Not enough current evidence to calculate a reliable score.");
  }
  return value as ScorableIntentScore;
}

export interface RecentScore {
  domain: string;
  company_name: string;
  score: number | null;
  score_band: "HOT" | "WARM" | "COLD" | null;
  created_at: string;
}

interface ScoreViewProps {
  creditsRemaining: number;
  recentScores: RecentScore[];
}

type ToolChip = {
  name: string;
  status: "running" | "done";
  result?: unknown;
  args?: Record<string, unknown>;
};

type ThreadMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; kind: "ui"; blocks: UiBlock[]; content: string; tools: ToolChip[]; billing?: string }
  | { id: string; role: "assistant"; kind: "text"; content: string; tools: ToolChip[]; isAnimating?: boolean }
  | {
      id: string;
      role: "assistant";
      kind: "thinking";
      mode: "score" | "chat";
      isStreaming: boolean;
      detail?: string;
    }
  | { id: string; role: "assistant"; kind: "stage_tool"; tool: ScoreStageToolState }
  | { id: string; role: "error"; content: string };

function messageTools(message: ThreadMessage): ToolChip[] {
  return message.role === "assistant" && (message.kind === "text" || message.kind === "ui") ? message.tools : [];
}

function nextId(): string {
  return crypto.randomUUID();
}

function billingLabel(result: ScoreCardData & { charged?: boolean; cached?: boolean }): string {
  if ("charged" in result && result.charged) return "1 credit";
  if ("cached" in result && result.cached) return "cache hit · free";
  return "no credit charged";
}

function formatRecentDate(iso: string): string {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso.slice(0, 10);
    return format(d, "MMM d, yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

function stageInputFromEvent(event: Extract<ScoreStreamEvent, { type: "stage" }>): Record<string, unknown> {
  if (event.stage === "domain") {
    return { company: event.company, domain: event.domain };
  }
  if (event.stage === "signals") {
    const axes = Object.entries(event.signals)
      .filter(([key, value]) => key !== "latestSignalDate" && value && typeof value === "object" && "score" in value)
      .map(([key]) => key);
    return { domain: event.domain, axes };
  }
  if (event.stage === "score") {
    return {
      domain: event.domain,
      intent_score: event.intent_score,
      score_band: event.score_band,
    };
  }
  return {
    urgency: event.urgency ?? null,
    has_action: Boolean(event.recommended_action),
  };
}

function thinkingDetail(stage: ScoreStageKey | null, billing?: string | null): string {
  if (billing) return `Scored · ${billing}`;
  if (!stage) return "Preparing score pipeline…";
  return `${SCORE_STAGE_TITLES[stage]}…`;
}

function ChatToolRows({ tools }: { tools: ToolChip[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-2">
      {tools.map((entry) => (
        <Tool
          key={entry.name}
          defaultOpen={entry.status === "done" && entry.result != null}
          className="mb-0 overflow-hidden rounded-lg border shadow-none"
        >
          <ToolHeader
            className="px-3 py-2 text-xs"
            title={entry.name.replace(/_/g, " ")}
            type={`tool-${entry.name}`}
            state={entry.status === "running" ? "input-available" : "output-available"}
          />
          <ToolContent className="space-y-3 p-3 pt-0">
            {entry.args ? <ToolInput input={entry.args} /> : null}
            <ToolOutput
              output={entry.result as ReactNode}
              errorText={undefined}
            />
          </ToolContent>
        </Tool>
      ))}
    </div>
  );
}

function AssistantText({ content, isAnimating }: { content: string; isAnimating?: boolean }) {
  return (
    <MessageResponse
      className="prose prose-sm dark:prose-invert max-w-none"
      isAnimating={Boolean(isAnimating)}
      caret={isAnimating ? "block" : undefined}
    >
      {content}
    </MessageResponse>
  );
}

interface ScorePromptStageProps {
  onScore: (value: string) => void;
  creditsRemaining: number;
  recentScores: RecentScore[];
  busy: boolean;
}

function submitPromptText(text: string, onSubmit: (value: string) => void) {
  const raw = text.trim();
  if (raw) onSubmit(raw);
}

function ScorePromptStage({ onScore, creditsRemaining, recentScores, busy }: ScorePromptStageProps) {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="gap-4 rounded-xl py-4 shadow-xs">
            <CardHeader className="px-4">
              <CardTitle className="text-xl">Score a company</CardTitle>
              <CardDescription>
                Paste a domain. Dated purchase triggers drive the score; then ask follow-ups.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <PromptInput
                className="rounded-xl border bg-muted/50 p-2 shadow-none"
                onSubmit={({ text }) => submitPromptText(text, onScore)}
              >
                <PromptInputBody>
                  <PromptInputTextarea
                    placeholder="stripe.com"
                    disabled={busy}
                    autoFocus
                    aria-label="Company domain"
                    className="min-h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                </PromptInputBody>
                <PromptInputFooter className="justify-between gap-3 px-1">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">1</span> credit on a fresh
                    scorable result · follow-ups{" "}
                    <span className="font-medium tabular-nums text-foreground">{CHAT_CREDIT_COST}</span> ·
                    cached 6h
                  </span>
                  <PromptInputSubmit disabled={busy} size="sm" className="rounded-lg">
                    Score
                  </PromptInputSubmit>
                </PromptInputFooter>
              </PromptInput>
            </CardContent>
            <CardFooter className="justify-between border-t px-4 pt-4 text-xs text-muted-foreground">
              <span>Returning tool — not a first-run tour</span>
              <span>
                <span className="font-medium tabular-nums text-foreground">{creditsRemaining}</span> credits left
              </span>
            </CardFooter>
          </Card>
        </div>

        {recentScores.length > 0 ? (
          <div className="px-4 lg:px-6">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-foreground">Recent</h2>
                <span className="text-xs text-muted-foreground">Re-score from history</span>
              </div>
              <div className="grid grid-cols-1 gap-2 @xl/main:grid-cols-2 @3xl/main:grid-cols-3">
                {recentScores.map((r) => (
                  <button
                    key={`${r.domain}-${r.created_at}`}
                    type="button"
                    onClick={() => onScore(r.domain)}
                    className="flex items-center gap-3 rounded-xl border border-transparent bg-card/80 p-3 text-left shadow-xs transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
                      style={{ background: avColor(r.company_name) }}
                      aria-hidden
                    >
                      {r.company_name[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{r.company_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.domain}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {r.score_band ? <BandBadge band={r.score_band} /> : null}
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {r.score ?? "—"} · {formatRecentDate(r.created_at)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 lg:px-6">
            <div className="flex min-h-[12rem] items-center justify-center rounded-xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
              No recent scores yet. Score a domain to populate this well.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function upsertStageTool(
  messages: ThreadMessage[],
  thinkingId: string,
  stage: ScoreStageKey,
  patch: Partial<ScoreStageToolState> & Pick<ScoreStageToolState, "status">,
): ThreadMessage[] {
  const existingIdx = messages.findIndex(
    (m) => m.role === "assistant" && m.kind === "stage_tool" && m.tool.stage === stage,
  );
  const nextTool: ScoreStageToolState = {
    stage,
    status: patch.status,
    input: patch.input,
    block: patch.block,
    errorText: patch.errorText,
    open: patch.open ?? (patch.status === "running" || patch.status === "done"),
  };

  if (existingIdx >= 0) {
    const current = messages[existingIdx];
    if (current.role === "assistant" && current.kind === "stage_tool") {
      const updated = [...messages];
      updated[existingIdx] = {
        ...current,
        tool: {
          ...current.tool,
          ...nextTool,
          input: patch.input ?? current.tool.input,
          block: patch.block === undefined ? current.tool.block : patch.block,
        },
      };
      return updated;
    }
  }

  const thinkingIdx = messages.findIndex((m) => m.id === thinkingId);
  // Keep Thinking above tools: append after the thinking row (or after last stage tool).
  let insertAt = messages.length;
  if (thinkingIdx >= 0) {
    insertAt = thinkingIdx + 1;
    for (let i = thinkingIdx + 1; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === "assistant" && m.kind === "stage_tool") insertAt = i + 1;
      else break;
    }
  }
  const next = [...messages];
  next.splice(insertAt, 0, {
    id: nextId(),
    role: "assistant",
    kind: "stage_tool",
    tool: nextTool,
  });
  return next;
}

export function ScoreView({ creditsRemaining, recentScores }: ScoreViewProps) {
  const searchParams = useSearchParams();
  const autoScoredRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeStage, setActiveStage] = useState<ScoreStageKey | null>(null);
  const [pinnedBlocks, setPinnedBlocks] = useState<UiBlock[]>([]);
  const [scoreBilling, setScoreBilling] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [watchlistByDomain, setWatchlistByDomain] = useState<Record<string, "adding" | "added">>({});

  useEffect(() => {
    const d = searchParams.get("domain")?.trim();
    if (!d) return;
    if (autoScoredRef.current === d) return;
    autoScoredRef.current = d;
    void submitMessage(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function runScore(raw: string, domain: string) {
    const thinkingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: raw },
      {
        id: thinkingId,
        role: "assistant",
        kind: "thinking",
        mode: "score",
        isStreaming: true,
        detail: thinkingDetail("domain"),
      },
      {
        id: nextId(),
        role: "assistant",
        kind: "stage_tool",
        tool: {
          stage: "domain",
          status: "running",
          input: { domain },
          open: true,
        },
      },
    ]);
    setBusy(true);
    setActiveStage("domain");
    setScoreBilling(null);
    try {
      let doneResult: (IntentScore & { charged?: boolean; cached?: boolean }) | null = null;
      let doneBilling: string | undefined;

      await streamScore(domain, (event) => {
        if (event.type === "stage") {
          setActiveStage(event.stage);
          const block = blockFromScoreStage(event);
          const input = stageInputFromEvent(event);

          if (event.stage === "score" && block) {
            // Intent hero stays in the tool output (AICSS mid-convo), not a detached pin dump.
            setPinnedBlocks([]);
          }

          setMessages((prev) => {
            let next = upsertStageTool(prev, thinkingId, event.stage, {
              status: "done",
              input,
              block,
              open: true,
            });

            const upcoming = nextScoreStage(event.stage);
            if (upcoming) {
              next = upsertStageTool(next, thinkingId, upcoming, {
                status: "running",
                input: upcoming === "domain" ? { domain } : { domain },
                open: true,
              });
            }

            return next.map((m) =>
              m.id === thinkingId && m.role === "assistant" && m.kind === "thinking"
                ? { ...m, isStreaming: true, detail: thinkingDetail(upcoming ?? event.stage) }
                : m,
            );
          });
          return;
        }

        if (event.type === "done") {
          doneResult = event.result;
          doneBilling = event.billing ?? billingLabel({
            ...event.result,
            intent_score: event.result.intent_score ?? 0,
            score_band: (event.result.score_band ?? "COLD") as ScoreBand,
          });
          setScoreBilling(doneBilling);
          setActiveStage(null);

          const rail: UiBlock = {
            type: "action_rail",
            company: event.result.company,
            domain: event.result.domain,
            suggestions: defaultSuggestions({
              company: event.result.company,
              score_band: event.result.score_band ?? "COLD",
            }),
          };

          const outreach: UiBlock[] = (event.result.email_subject || event.result.talk_track)
            ? [{
                type: "outreach_studio",
                company: event.result.company,
                subject: event.result.email_subject,
                talk_track: event.result.talk_track,
              }]
            : [];

          setMessages((prev) => {
            const withoutThinkingStream = prev.map((m) =>
              m.id === thinkingId && m.role === "assistant" && m.kind === "thinking"
                ? { ...m, isStreaming: false, detail: thinkingDetail(null, doneBilling) }
                : m,
            );
            const extras = [...outreach, rail];
            if (extras.length === 0) return withoutThinkingStream;
            return [
              ...withoutThinkingStream,
              {
                id: nextId(),
                role: "assistant",
                kind: "ui",
                blocks: extras,
                content: "",
                tools: [],
                billing: doneBilling,
              },
            ];
          });
        }
      });

      if (doneResult) {
        const payload = requireScorableResult(doneResult);
        try {
          const id = await seedChatSession({
            sessionId: sessionId ?? undefined,
            title: payload.domain,
            user: `Score ${payload.domain}`,
            assistant: `${payload.company} scored ${payload.intent_score}/100 (${payload.score_band}).`,
          });
          setSessionId(id);
        } catch {
          // Follow-ups can still create a session on first chat turn.
        }
      }
    } catch (e) {
      setActiveStage(null);
      setMessages((prev) => [
        ...prev
          .filter((m) => !(m.role === "assistant" && m.kind === "thinking" && m.id === thinkingId))
          .map((m) =>
            m.role === "assistant" && m.kind === "stage_tool" && m.tool.status === "running"
              ? { ...m, tool: { ...m.tool, status: "error" as const, errorText: (e as Error).message, open: true } }
              : m,
          ),
        { id: thinkingId, role: "error", content: (e as Error).message },
      ]);
    } finally {
      setBusy(false);
      setActiveStage(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.kind === "thinking" && m.mode === "score" && m.id === thinkingId
            ? { ...m, isStreaming: false }
            : m,
        ),
      );
    }
  }

  async function runFollowUp(text: string) {
    const thinkingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: text },
      {
        id: thinkingId,
        role: "assistant",
        kind: "thinking",
        mode: "chat",
        isStreaming: true,
        detail: "Drafting follow-up…",
      },
    ]);
    setBusy(true);
    try {
      const nextSession = await streamChat(
        { message: text, session_id: sessionId ?? undefined },
        (event) => {
          setMessages((prev) => {
            const current = prev.find((m) => m.id === thinkingId);
            if (!current) return prev;
            if (event.type === "text") {
              const withoutThinking = prev.filter((m) => !(m.role === "assistant" && m.kind === "thinking" && m.id === thinkingId));
              const existing = withoutThinking.find((m) => m.id === thinkingId);
              if (existing && existing.role === "assistant" && existing.kind === "ui") {
                return withoutThinking.map((m) =>
                  m.id === thinkingId
                    ? { ...existing, content: existing.content + event.content }
                    : m,
                );
              }
              const next: ThreadMessage =
                existing && existing.role === "assistant" && existing.kind === "text"
                  ? { ...existing, content: existing.content + event.content, isAnimating: true }
                  : {
                      id: thinkingId,
                      role: "assistant",
                      kind: "text",
                      content: event.content,
                      tools: messageTools(current),
                      isAnimating: true,
                    };
              if (existing) {
                return withoutThinking.map((m) => (m.id === thinkingId ? next : m));
              }
              return [...withoutThinking, next];
            }
            if (event.type === "ui") {
              const blocks = sanitizeUiBlocks(event.blocks);
              if (blocks.length === 0) return prev;
              const withoutThinking = prev.filter((m) => !(m.role === "assistant" && m.kind === "thinking" && m.id === thinkingId));
              const existing = withoutThinking.find((m) => m.id === thinkingId);
              const next: ThreadMessage = {
                id: thinkingId,
                role: "assistant",
                kind: "ui",
                blocks,
                content: existing && existing.role === "assistant" && "content" in existing ? existing.content : "",
                tools: messageTools(existing ?? current),
              };
              if (existing) {
                return withoutThinking.map((m) => (m.id === thinkingId ? next : m));
              }
              return [...withoutThinking, next];
            }
            if (event.type === "tool_call") {
              const withoutThinking = prev.filter((m) => !(m.role === "assistant" && m.kind === "thinking" && m.id === thinkingId));
              const existing = withoutThinking.find((m) => m.id === thinkingId);
              const tools: ToolChip[] = [
                ...messageTools(existing ?? current),
                { name: event.name, status: "running", args: event.args },
              ];
              const next: ThreadMessage =
                existing && existing.role === "assistant" && (existing.kind === "text" || existing.kind === "ui")
                  ? { ...existing, tools }
                  : { id: thinkingId, role: "assistant", kind: "text", content: "", tools, isAnimating: false };
              if (existing) {
                return withoutThinking.map((m) => (m.id === thinkingId ? next : m));
              }
              return [...withoutThinking, next];
            }
            if (event.type === "tool_result") {
              const tools: ToolChip[] = messageTools(current).map((t) => (
                t.name === event.name && t.status === "running" ? { ...t, status: "done", result: event.result } : t
              ));
              const card = scoreFromToolResult(event.name, event.result);
              if (current.role === "assistant" && current.kind === "ui") {
                return prev.map((m) => (m.id === thinkingId ? { ...current, tools } : m));
              }
              if (card) {
                const next: ThreadMessage = {
                  id: thinkingId,
                  role: "assistant",
                  kind: "ui",
                  blocks: workspaceFromScore(card),
                  content: current.role === "assistant" && "content" in current ? current.content : "",
                  tools,
                };
                return prev.map((m) => (m.id === thinkingId ? next : m));
              }
              const base: ThreadMessage = current.role === "assistant" && current.kind === "text"
                ? { ...current, tools, isAnimating: false }
                : { id: thinkingId, role: "assistant", kind: "text", content: "", tools };
              return prev.map((m) => (m.id === thinkingId ? base : m));
            }
            return prev;
          });
        },
      );
      if (nextSession) setSessionId(nextSession);
      setMessages((prev) =>
        prev
          .filter((m) => !(m.role === "assistant" && m.kind === "thinking" && m.id === thinkingId))
          .map((m) =>
            m.id === thinkingId && m.role === "assistant" && m.kind === "text"
              ? { ...m, isAnimating: false }
              : m,
          ),
      );
    } catch (e) {
      setMessages((prev) => prev.map((m) => (
        m.id === thinkingId
          ? { id: thinkingId, role: "error", content: (e as Error).message }
          : m
      )));
    } finally {
      setBusy(false);
    }
  }

  async function submitMessage(rawInput: string) {
    const raw = rawInput.trim();
    if (!raw || busy) return;
    const domain = extractDomain(raw);
    if (domain) {
      await runScore(raw, domain);
      return;
    }
    await runFollowUp(raw);
  }

  async function handleAddToWatchlist(company: string, domain: string) {
    setWatchlistByDomain((prev) => ({ ...prev, [domain]: "adding" }));
    try {
      const res = await fetch("/api/dashboard/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, company_name: company }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setWatchlistByDomain((prev) => ({ ...prev, [domain]: "added" }));
    } catch {
      setWatchlistByDomain((prev) => {
        const next = { ...prev };
        delete next[domain];
        return next;
      });
    }
  }

  function handleNewChat() {
    if (busy) return;
    setMessages([]);
    setSessionId(null);
    setPinnedBlocks([]);
    setScoreBilling(null);
    setActiveStage(null);
    autoScoredRef.current = null;
  }

  const active = messages.length > 0;
  const lastUi = [...messages].reverse().find((m) => m.role === "assistant" && m.kind === "ui");
  const lastScoreHero = [...messages].reverse().find(
    (m): m is Extract<ThreadMessage, { role: "assistant"; kind: "stage_tool" }> =>
      m.role === "assistant"
      && m.kind === "stage_tool"
      && m.tool.stage === "score"
      && m.tool.block?.type === "intent_hero",
  );
  const chips = lastUi && lastUi.kind === "ui"
    ? suggestionsFromBlocks(lastUi.blocks)
    : lastScoreHero?.tool.block?.type === "intent_hero"
      ? defaultSuggestions({
          company: lastScoreHero.tool.block.company,
          score_band: lastScoreHero.tool.block.score_band,
        })
      : pinnedBlocks.length > 0
        ? defaultSuggestions({
            company: pinnedBlocks[0]?.type === "intent_hero" ? pinnedBlocks[0].company : "Company",
            score_band: pinnedBlocks[0]?.type === "intent_hero" ? pinnedBlocks[0].score_band : "COLD",
          })
        : [];

  const workspaceHandlers = {
    onWatchlist: (company: string, d: string) => void handleAddToWatchlist(company, d),
    watchlistByDomain,
    onPrompt: (prompt: string) => void submitMessage(prompt),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!active ? (
        <ScorePromptStage
          onScore={(value) => void submitMessage(value)}
          creditsRemaining={creditsRemaining}
          recentScores={recentScores}
          busy={busy}
        />
      ) : (
        <div className="@container/main flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto py-4 md:gap-6 md:py-6">
            {pinnedBlocks.length > 0 ? (
              <div className="shrink-0 px-4 lg:px-6">
                <div className="mx-auto w-full max-w-5xl">
                  <GenUiWorkspace blocks={pinnedBlocks} handlers={workspaceHandlers} />
                </div>
              </div>
            ) : null}
            <Conversation className="min-h-0 flex-1 px-4 lg:px-6">
              <ConversationContent className="mx-auto flex w-full max-w-5xl flex-col gap-3">
                {messages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <Message key={message.id} from="user">
                        <MessageContent className="rounded-xl bg-foreground px-3 py-2 text-sm text-background">
                          {message.content}
                        </MessageContent>
                      </Message>
                    );
                  }
                  if (message.role === "error") {
                    return (
                      <Message key={message.id} from="assistant">
                        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                          {message.content}
                        </p>
                      </Message>
                    );
                  }
                  if (message.kind === "thinking") {
                    return (
                      <Message key={message.id} from="assistant">
                        <Reasoning isStreaming={message.isStreaming} className="mb-0 w-full">
                          <ReasoningTrigger />
                          <ReasoningContent>
                            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed">
                              <p>{message.detail ?? (message.mode === "score" ? thinkingDetail(activeStage, scoreBilling) : "Working…")}</p>
                              {message.mode === "score" && scoreBilling && !message.isStreaming ? (
                                <p className="mt-1 tabular-nums text-muted-foreground">{scoreBilling}</p>
                              ) : null}
                            </div>
                          </ReasoningContent>
                        </Reasoning>
                      </Message>
                    );
                  }
                  if (message.kind === "stage_tool") {
                    return (
                      <Message key={`${message.id}-${message.tool.status}`} from="assistant">
                        <ScoreStageToolRow tool={message.tool} handlers={workspaceHandlers} />
                      </Message>
                    );
                  }
                  if (message.kind === "ui") {
                    return (
                      <Message key={message.id} from="assistant">
                        <MessageContent className="flex w-full flex-col gap-3">
                          {message.billing ? (
                            <p className="text-xs tabular-nums text-muted-foreground">{message.billing}</p>
                          ) : null}
                          <ChatToolRows tools={message.tools} />
                          {message.content ? <AssistantText content={message.content} /> : null}
                          <GenUiWorkspace blocks={message.blocks} handlers={workspaceHandlers} />
                        </MessageContent>
                      </Message>
                    );
                  }
                  return (
                    <Message key={message.id} from="assistant">
                      <MessageContent className="flex w-full flex-col gap-3">
                        <ChatToolRows tools={message.tools} />
                        {message.content ? (
                          <AssistantText content={message.content} isAnimating={message.isAnimating} />
                        ) : null}
                      </MessageContent>
                    </Message>
                  );
                })}
              </ConversationContent>
              <ConversationScrollButton className="rounded-full border bg-card shadow-xs" />
            </Conversation>
          </div>

          <div className="shrink-0 border-t bg-background/80 px-4 py-4 backdrop-blur-sm lg:px-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
              {chips.length > 0 && (
                <Suggestions className="flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <Suggestion
                      key={chip.prompt}
                      suggestion={chip.prompt}
                      disabled={busy}
                      onClick={(prompt) => void submitMessage(prompt)}
                      className="rounded-lg"
                    >
                      {chip.label}
                    </Suggestion>
                  ))}
                </Suggestions>
              )}
              <Card className="gap-0 rounded-xl py-2 shadow-xs">
                <CardContent className="px-2">
                  <PromptInput
                    className="border-0 bg-transparent p-0 shadow-none"
                    onSubmit={({ text }) => submitPromptText(text, (value) => void submitMessage(value))}
                  >
                    <PromptInputBody>
                      <PromptInputTextarea
                        placeholder="Ask a follow-up or score another domain"
                        disabled={busy}
                        aria-label="Chat message"
                        className="min-h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </PromptInputBody>
                    <PromptInputFooter className="justify-between gap-3 px-1">
                      <span className="text-xs text-muted-foreground">
                        Follow-ups <span className="font-medium tabular-nums text-foreground">{CHAT_CREDIT_COST}</span> ·
                        new domain <span className="font-medium tabular-nums text-foreground">1</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg"
                          onClick={handleNewChat}
                          disabled={busy}
                        >
                          New chat
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-medium tabular-nums text-foreground">{creditsRemaining}</span> left
                        </span>
                        <PromptInputSubmit disabled={busy} size="sm" className="rounded-lg">
                          Send
                        </PromptInputSubmit>
                      </div>
                    </PromptInputFooter>
                  </PromptInput>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
