"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Clock3, Coins, Gauge, Plus, Sparkles } from "lucide-react";
import type { IntentScore, ScoreBand } from "@/lib/types";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { extractDomain, seedChatSession, streamChat } from "@/lib/chat-client";
import { avColor, scoreFromToolResult } from "@/components/score/score-result-card";
import type { ScoreCardData } from "@/components/score/score-result-card";
import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import { sanitizeUiBlocks, suggestionsFromBlocks, workspaceFromScore } from "@/lib/gen-ui";
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
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Tool, ToolHeader } from "@/components/ai-elements/tool";
import { EmptyState, PageHeader, PageSurface } from "@/components/app-ui/page-primitives";
import {
  ScorePageFrame,
  ScoreWorkspaceLayout,
} from "@/components/score/score-workspace-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

async function requestScore(domain: string): Promise<ScorableIntentScore> {
  const response = await fetch("/api/v1/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain }),
  });
  const payload = await response.json() as IntentScore & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Scoring failed");
  return requireScorableResult(payload);
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

const HOT_PICKS = [
  { domain: "stripe.com",     name: "Stripe",      signal: "funding" },
  { domain: "anthropic.com",  name: "Anthropic",   signal: "news" },
  { domain: "linear.app",     name: "Linear",      signal: "hiring" },
  { domain: "notion.so",      name: "Notion",      signal: "news" },
  { domain: "databricks.com", name: "Databricks",  signal: "tech" },
];

type ToolChip = {
  name: string;
  status: "running" | "done";
  result?: unknown;
};

type ThreadMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; kind: "ui"; blocks: UiBlock[]; content: string; tools: ToolChip[]; billing?: string }
  | { id: string; role: "assistant"; kind: "text"; content: string; tools: ToolChip[] }
  | { id: string; role: "assistant"; kind: "thinking"; mode: "score" | "chat" }
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

const STEPS = ["Domain resolved", "Funding signal", "Hiring + news", "Technology trigger", "Web + GitHub context", "AI thesis"];

function LiveProgressBar({
  loading,
  stepIndex,
  billingLabel: label,
}: {
  loading: boolean;
  stepIndex: number;
  billingLabel?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(parseFloat(((Date.now() - start) / 1000).toFixed(2))), 100);
    return () => clearInterval(t);
  }, [loading]);

  return (
    <div className="live-progress">
      <span className="pulse" />
      <div className="steps">
        {STEPS.map((s, i) => (
          <span key={i} className={`step ${i < stepIndex ? "done" : i === stepIndex ? "active" : "pending"}`}>
            <span className="check">
              {i < stepIndex && (
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" width="7" height="7">
                  <path d="M2 5l2 2 4-4" />
                </svg>
              )}
              {i === stepIndex && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "block" }} />
              )}
            </span>
            {s}
          </span>
        ))}
      </div>
      {!loading && label && <span className="timing">{elapsed}s · {label}</span>}
    </div>
  );
}

function ToolChips({ tools }: { tools: ToolChip[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="chat-tools">
      {tools.map((entry) => (
        <Tool key={entry.name} className="score-tool-chip" defaultOpen={false}>
          <ToolHeader
            className="score-tool-chip-header"
            title={entry.name.replace(/_/g, " ")}
            type={`tool-${entry.name}`}
            state={entry.status === "running" ? "input-streaming" : "output-available"}
          />
        </Tool>
      ))}
    </div>
  );
}

function AssistantText({ content }: { content: string }) {
  return <MessageResponse className="chat-md">{content}</MessageResponse>;
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
    <ScorePageFrame mode="entry">
      <PageHeader
        eyebrow="Account research"
        title="Score a company"
        description="Enter a company domain to verify current buying signals, understand the evidence, and continue with focused follow-up questions."
        actions={(
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <Coins className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold tabular-nums">{creditsRemaining}</span>
            <span className="text-muted-foreground">credits left</span>
          </div>
        )}
      />

      <Card className="gap-5 py-5 shadow-sm">
        <CardHeader className="gap-1 px-5 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-active)]">
              <Gauge className="size-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Company domain</CardTitle>
              <CardDescription>Fresh scorable results use 1 credit. Cached results do not.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 sm:px-6">
          <PromptInput
            className="score-elements-input"
            onSubmit={({ text }) => submitPromptText(text, onScore)}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="stripe.com"
                disabled={busy}
                autoFocus
                aria-label="Company domain"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" aria-hidden="true" />
                Cached for 6 hours
              </div>
              <PromptInputSubmit disabled={busy} className="score-elements-submit">
                Score company
                <ArrowRight className="size-4" aria-hidden="true" />
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {HOT_PICKS.map((pick) => (
                <Button
                  key={pick.domain}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onScore(pick.domain)}
                >
                  <span
                    className="flex size-5 items-center justify-center rounded text-[10px] font-semibold text-black"
                    style={{ background: avColor(pick.name) }}
                  >
                    {pick.name[0]}
                  </span>
                  {pick.domain}
                  <span className="text-xs font-normal text-muted-foreground">{pick.signal}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <span>Four dated trigger axes</span>
            <span>Source-backed evidence</span>
            <span>Follow-ups use {CHAT_CREDIT_COST} credits</span>
          </div>
        </CardContent>
      </Card>

      {recentScores.length > 0 ? (
        <PageSurface title="Recent scores" description="Continue research from a recently scored account.">
          <div className="divide-y divide-border">
            {recentScores.map((recent) => (
              <button
                key={`${recent.domain}-${recent.created_at}`}
                type="button"
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                onClick={() => onScore(recent.domain)}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-black"
                  style={{ background: avColor(recent.company_name) }}
                >
                  {recent.company_name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{recent.company_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{recent.domain}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{recent.score ?? "—"}</span>
                <span className="w-12 text-right text-xs font-medium text-muted-foreground">{recent.score_band ?? "Unavailable"}</span>
              </button>
            ))}
          </div>
        </PageSurface>
      ) : null}
    </ScorePageFrame>
  );
}

export function ScoreView({ creditsRemaining, recentScores }: ScoreViewProps) {
  const searchParams = useSearchParams();
  const autoScoredRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [watchlistByDomain, setWatchlistByDomain] = useState<Record<string, "adding" | "added">>({});
  const scoring = busy && messages.some((m) => m.role === "assistant" && m.kind === "thinking" && m.mode === "score");

  useEffect(() => {
    const d = searchParams.get("domain")?.trim();
    if (!d) return;
    if (autoScoredRef.current === d) return;
    autoScoredRef.current = d;
    void submitMessage(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!scoring) { setStepIndex(0); return; }
    setStepIndex(0);
    const t = setInterval(() => {
      setStepIndex((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 430);
    return () => clearInterval(t);
  }, [scoring]);

  async function runScore(raw: string, domain: string) {
    const thinkingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: raw },
      { id: thinkingId, role: "assistant", kind: "thinking", mode: "score" },
    ]);
    setBusy(true);
    try {
      const payload = await requestScore(domain);
      setMessages((prev) => prev.map((m) => (
        m.id === thinkingId
          ? {
              id: thinkingId,
              role: "assistant",
              kind: "ui",
              blocks: workspaceFromScore(payload),
              content: "",
              tools: [],
              billing: billingLabel(payload),
            }
          : m
      )));
      try {
        const id = await seedChatSession({
          sessionId: sessionId ?? undefined,
          title: payload.domain,
          user: `Score ${payload.domain}`,
          assistant: payload.ai_summary || `${payload.company} scored ${payload.intent_score}/100 (${payload.score_band}).`,
        });
        setSessionId(id);
      } catch {
        // Follow-ups can still create a session on first chat turn.
      }
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

  async function runFollowUp(text: string) {
    const thinkingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: text },
      { id: thinkingId, role: "assistant", kind: "thinking", mode: "chat" },
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
              if (current.role === "assistant" && current.kind === "ui") {
                return prev.map((m) => (m.id === thinkingId ? { ...current, content: current.content + event.content } : m));
              }
              const next: ThreadMessage = current.role === "assistant" && current.kind === "text"
                ? { ...current, content: current.content + event.content }
                : { id: thinkingId, role: "assistant", kind: "text", content: event.content, tools: messageTools(current) };
              return prev.map((m) => (m.id === thinkingId ? next : m));
            }
            if (event.type === "ui") {
              const blocks = sanitizeUiBlocks(event.blocks);
              if (blocks.length === 0) return prev;
              const next: ThreadMessage = {
                id: thinkingId,
                role: "assistant",
                kind: "ui",
                blocks,
                content: current.role === "assistant" && "content" in current ? current.content : "",
                tools: messageTools(current),
              };
              return prev.map((m) => (m.id === thinkingId ? next : m));
            }
            if (event.type === "tool_call") {
              const tools: ToolChip[] = [...messageTools(current), { name: event.name, status: "running" }];
              if (current.role === "assistant" && (current.kind === "text" || current.kind === "ui")) {
                return prev.map((m) => (m.id === thinkingId ? { ...current, tools } : m));
              }
              return prev.map((m) => (
                m.id === thinkingId
                  ? { id: thinkingId, role: "assistant", kind: "text", content: "", tools }
                  : m
              ));
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
                ? { ...current, tools }
                : { id: thinkingId, role: "assistant", kind: "text", content: "", tools };
              return prev.map((m) => (m.id === thinkingId ? base : m));
            }
            return prev;
          });
        },
      );
      if (nextSession) setSessionId(nextSession);
      setMessages((prev) => {
        const current = prev.find((m) => m.id === thinkingId);
        if (current && current.role === "assistant" && current.kind === "thinking") {
          return prev.map((m) => (
            m.id === thinkingId
              ? { id: thinkingId, role: "assistant", kind: "text", content: "", tools: [] }
              : m
          ));
        }
        return prev;
      });
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
    autoScoredRef.current = null;
  }

  const active = messages.length > 0;
  const lastUi = [...messages].reverse().find((m) => m.role === "assistant" && m.kind === "ui");
  const chips = lastUi && lastUi.kind === "ui" ? suggestionsFromBlocks(lastUi.blocks) : [];

  const conversation = (
    <Conversation className="score-chat-thread">
      <ConversationContent className="score-chat-col">
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <Message key={message.id} from="user">
                <MessageContent className="chat-bubble user">{message.content}</MessageContent>
              </Message>
            );
          }
          if (message.role === "error") {
            return (
              <Message key={message.id} from="assistant">
                <p className="chat-error" role="alert">{message.content}</p>
              </Message>
            );
          }
          if (message.kind === "thinking") {
            return (
              <Message key={message.id} from="assistant">
                {message.mode === "score" ? (
                  <LiveProgressBar loading stepIndex={stepIndex} />
                ) : (
                  <div className="chat-thinking">
                    <span className="pulse" />
                    Preparing the next view…
                  </div>
                )}
              </Message>
            );
          }
          if (message.kind === "ui") {
            return (
              <Message key={message.id} from="assistant">
                <MessageContent className="space-y-3">
                  {message.billing ? (
                    <LiveProgressBar
                      loading={false}
                      stepIndex={STEPS.length - 1}
                      billingLabel={message.billing}
                    />
                  ) : null}
                  <ToolChips tools={message.tools} />
                  {message.content ? <AssistantText content={message.content} /> : null}
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--brand-active)]" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-foreground">Evidence workspace updated</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Review the score, signal coverage, thesis, and recommended action in the Evidence pane.
                      </p>
                    </div>
                  </div>
                </MessageContent>
              </Message>
            );
          }
          return (
            <Message key={message.id} from="assistant">
              <MessageContent>
                <ToolChips tools={message.tools} />
                {message.content ? <AssistantText content={message.content} /> : null}
              </MessageContent>
            </Message>
          );
        })}
      </ConversationContent>
      <ConversationScrollButton className="score-elements-scroll" />
    </Conversation>
  );

  const composer = (
    <div className="score-chat-composer">
      {chips.length > 0 ? (
        <Suggestions className="score-elements-suggestions">
          {chips.map((chip) => (
            <Suggestion
              key={chip.prompt}
              suggestion={chip.prompt}
              disabled={busy}
              onClick={(prompt) => void submitMessage(prompt)}
            >
              {chip.label}
            </Suggestion>
          ))}
        </Suggestions>
      ) : null}
      <PromptInput
        className="score-elements-input"
        onSubmit={({ text }) => submitPromptText(text, (value) => void submitMessage(value))}
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder="Ask a follow-up or score another domain"
            disabled={busy}
            aria-label="Chat message"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <span className="text-xs text-muted-foreground">
            Follow-up {CHAT_CREDIT_COST} credits · new score 1 credit
          </span>
          <PromptInputSubmit disabled={busy} className="score-elements-submit">
            Send
            <ArrowRight className="size-4" aria-hidden="true" />
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );

  const evidence = lastUi && lastUi.kind === "ui" ? (
    <GenUiWorkspace
      blocks={lastUi.blocks}
      handlers={{
        onWatchlist: (company, domain) => void handleAddToWatchlist(company, domain),
        watchlistByDomain,
        onPrompt: (prompt) => void submitMessage(prompt),
      }}
    />
  ) : (
    <EmptyState
      className="min-h-[24rem]"
      icon={<Gauge className="size-4" aria-hidden="true" />}
      title={scoring ? "Verifying account signals" : "Evidence will appear here"}
      description={
        scoring
          ? "We are checking dated purchase signals and assembling the evidence snapshot."
          : "Score a company to review its signal coverage, score breakdown, and recommended action."
      }
    />
  );

  return (
    <div className="score-chat">
      {!active ? (
        <ScorePromptStage
          onScore={(value) => void submitMessage(value)}
          creditsRemaining={creditsRemaining}
          recentScores={recentScores}
          busy={busy}
        />
      ) : (
        <ScorePageFrame mode="workspace">
          <PageHeader
            eyebrow="Account research"
            title="Score workspace"
            description="Ask focused questions in the conversation and inspect the source-backed evidence alongside it."
            actions={(
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  <strong className="font-semibold tabular-nums text-foreground">{creditsRemaining}</strong> credits left
                </span>
                <Button type="button" size="sm" variant="outline" onClick={handleNewChat} disabled={busy}>
                  <Plus className="size-4" aria-hidden="true" />
                  New chat
                </Button>
              </div>
            )}
          />
          <ScoreWorkspaceLayout
            conversation={conversation}
            composer={composer}
            evidence={evidence}
          />
        </ScorePageFrame>
      )}
    </div>
  );
}
