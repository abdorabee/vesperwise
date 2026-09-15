"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import type { IntentScore, ScoreBand } from "@/lib/types";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { extractDomain, seedChatSession, streamChat } from "@/lib/chat-client";
import { BandBadge, avColor, scoreFromToolResult } from "@/components/score/score-result-card";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function formatRecentDate(iso: string): string {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso.slice(0, 10);
    return format(d, "MMM d, yyyy");
  } catch {
    return iso.slice(0, 10);
  }
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
    <div className="rounded-xl bg-muted/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className={cn(
            "size-2 rounded-full",
            loading ? "animate-pulse bg-foreground" : "bg-[color:var(--hot)]",
          )}
        />
        {loading ? "Scoring…" : "Scored"}
        {!loading && label ? (
          <span className="ml-auto tabular-nums text-xs">
            {elapsed}s · {label}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
              i < stepIndex && "border-foreground/20 bg-card text-foreground",
              i === stepIndex && "border-foreground/40 bg-card font-medium text-foreground",
              i > stepIndex && "border-transparent text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                i < stepIndex && "bg-foreground",
                i === stepIndex && "bg-foreground",
                i > stepIndex && "bg-border",
              )}
            />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function ToolChips({ tools }: { tools: ToolChip[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tools.map((entry) => (
        <Tool key={entry.name} className="overflow-hidden rounded-lg border shadow-none" defaultOpen={false}>
          <ToolHeader
            className="px-3 py-2 text-xs"
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
  return <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">{content}</MessageResponse>;
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
            <Conversation className="min-h-0 flex-1 px-4 lg:px-6">
              <ConversationContent className="mx-auto flex w-full max-w-5xl flex-col gap-4">
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
                        {message.mode === "score" ? (
                          <LiveProgressBar loading stepIndex={stepIndex} />
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                            <span className="size-2 animate-pulse rounded-full bg-foreground" />
                            Designing view…
                          </div>
                        )}
                      </Message>
                    );
                  }
                  if (message.kind === "ui") {
                    return (
                      <Message key={message.id} from="assistant">
                        <MessageContent className="flex w-full flex-col gap-4">
                          {message.billing && (
                            <LiveProgressBar
                              loading={false}
                              stepIndex={STEPS.length - 1}
                              billingLabel={message.billing}
                            />
                          )}
                          <ToolChips tools={message.tools} />
                          {message.content && <AssistantText content={message.content} />}
                          <GenUiWorkspace
                            blocks={message.blocks}
                            handlers={{
                              onWatchlist: (company, d) => void handleAddToWatchlist(company, d),
                              watchlistByDomain,
                              onPrompt: (prompt) => void submitMessage(prompt),
                            }}
                          />
                        </MessageContent>
                      </Message>
                    );
                  }
                  return (
                    <Message key={message.id} from="assistant">
                      <MessageContent className="flex w-full flex-col gap-3">
                        <ToolChips tools={message.tools} />
                        {message.content && <AssistantText content={message.content} />}
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
