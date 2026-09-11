"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { IntentScore, ScoreBand } from "@/lib/types";
import { CHAT_CREDIT_COST } from "@/lib/types";
import { extractDomain, seedChatSession, streamChat } from "@/lib/chat-client";
import { scoreFromToolResult } from "@/components/score/score-result-card";
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
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Tool, ToolHeader } from "@/components/ai-elements/tool";
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

function formatScoreDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function bandTone(band: RecentScore["score_band"]): "hot" | "warm" | "cold" {
  if (band === "HOT") return "hot";
  if (band === "WARM") return "warm";
  return "cold";
}

function recentAvatarTone(name: string): string {
  const palette = [
    "linear-gradient(135deg, #3a3f45, #8a8f98)",
    "linear-gradient(135deg, #2a3038, #5c6570)",
    "linear-gradient(135deg, #454a52, #9aa0a8)",
    "linear-gradient(135deg, #32363c, #6e757e)",
  ];
  return palette[(name.charCodeAt(0) ?? 0) % palette.length];
}

function ScoreComposerCost({
  primary,
  balance,
}: {
  primary: ReactNode;
  balance: number;
}) {
  return (
    <div className="score-composer-cost" aria-live="polite">
      <span className="score-composer-cost-primary">{primary}</span>
      <span className="score-composer-cost-balance">
        <span className="quantity">{balance}</span> credits left
      </span>
    </div>
  );
}

function ScorePromptStage({ onScore, creditsRemaining, recentScores, busy }: ScorePromptStageProps) {
  const zeroCredits = creditsRemaining < 1;

  return (
    <div className="score-entry">
      <div className="score-entry-inner">
        <header className="score-entry-header">
          <h1 className="score-entry-title">Score an account</h1>
          <p className="score-entry-hint">Paste a company domain. Fresh scores cost 1 credit; cache hits are free for 6h.</p>
        </header>

        <PromptInput
          className="score-elements-input"
          onSubmit={({ text }) => submitPromptText(text, onScore)}
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="score-elements-textarea"
              placeholder="company.com"
              disabled={busy || zeroCredits}
              autoFocus
              aria-label="Company domain"
            />
          </PromptInputBody>
          <PromptInputFooter className="score-elements-footer">
            <PromptInputTools>
              <ScoreComposerCost
                primary={
                  <>
                    <span className="quantity">1</span> credit · cache{" "}
                    <span className="quantity">6</span>h free
                  </>
                }
                balance={creditsRemaining}
              />
            </PromptInputTools>
            <PromptInputSubmit
              disabled={busy || zeroCredits}
              size="sm"
              variant="default"
              className="score-elements-submit rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
            >
              Score
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>

        {zeroCredits && (
          <p className="score-entry-warn" role="status">
            No credits left. Top up or wait for your monthly reset before scoring.
          </p>
        )}

        <section className="score-recent" aria-label="Recent scores">
          <div className="score-recent-label">Recent</div>
          {recentScores.length === 0 ? (
            <p className="score-recent-empty">No scores yet. Your last six appear here with dates.</p>
          ) : (
            <ul className="score-recent-list">
              {recentScores.map((r) => {
                const tone = bandTone(r.score_band);
                const when = formatScoreDate(r.created_at);
                return (
                  <li key={`${r.domain}-${r.created_at}`}>
                    <button
                      type="button"
                      className="score-recent-row"
                      onClick={() => onScore(r.domain)}
                      disabled={busy}
                    >
                      <span
                        className="score-recent-av"
                        style={{ background: recentAvatarTone(r.company_name || r.domain) }}
                        aria-hidden
                      >
                        {(r.company_name || r.domain)[0]?.toUpperCase()}
                      </span>
                      <span className="score-recent-copy">
                        <span className="score-recent-name">{r.company_name || r.domain}</span>
                        <span className="score-recent-domain">{r.domain}</span>
                      </span>
                      <span className="score-recent-meta">
                        <span className={cn("score-recent-score", `is-${tone}`)}>
                          <span className="quantity">{r.score ?? "—"}</span>
                          {r.score_band && <span className="score-recent-band">{r.score_band}</span>}
                        </span>
                        {when && (
                          <time className="score-recent-date quantity" dateTime={r.created_at}>
                            {when}
                          </time>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
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
    <div className="score-chat">
      {!active ? (
        <ScorePromptStage
          onScore={(value) => void submitMessage(value)}
          creditsRemaining={creditsRemaining}
          recentScores={recentScores}
          busy={busy}
        />
      ) : (
        <>
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
                          Designing view…
                        </div>
                      )}
                    </Message>
                  );
                }
                if (message.kind === "ui") {
                  return (
                    <Message key={message.id} from="assistant">
                      <MessageContent>
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
                    <MessageContent>
                      <ToolChips tools={message.tools} />
                      {message.content && <AssistantText content={message.content} />}
                    </MessageContent>
                  </Message>
                );
              })}
            </ConversationContent>
            <ConversationScrollButton className="score-elements-scroll" />
          </Conversation>
          <div className="score-chat-composer">
            {chips.length > 0 && (
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
            )}
            <PromptInput
              className="score-elements-input"
              onSubmit={({ text }) => submitPromptText(text, (value) => void submitMessage(value))}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  className="score-elements-textarea"
                  placeholder="Ask a follow-up or score another domain"
                  disabled={busy}
                  aria-label="Chat message"
                />
              </PromptInputBody>
              <PromptInputFooter className="score-elements-footer">
                <PromptInputTools>
                  <ScoreComposerCost
                    primary={
                      <>
                        Follow-up <span className="quantity">{CHAT_CREDIT_COST}</span> · domain{" "}
                        <span className="quantity">1</span>
                      </>
                    }
                    balance={creditsRemaining}
                  />
                </PromptInputTools>
                <div className="score-composer-actions">
                  <button type="button" className="chat-new" onClick={handleNewChat} disabled={busy}>
                    New chat
                  </button>
                  <PromptInputSubmit
                    disabled={busy}
                    size="sm"
                    variant="default"
                    className="score-elements-submit rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                  >
                    Send
                  </PromptInputSubmit>
                </div>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </>
      )}
    </div>
  );
}
