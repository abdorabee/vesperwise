"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import { GenUiWorkspace } from "@/components/score/gen-ui/workspace";
import { ScoreComposer } from "@/components/score/score-composer";
import { ScoreCoverageIncomplete } from "@/components/score/score-coverage-incomplete";
import { ScoreEmptyState } from "@/components/score/score-empty-state";
import { ScoreResearchStatus } from "@/components/score/score-research-status";
import { ScorePageFrame, ScoreWorkspaceLayout } from "@/components/score/score-workspace-layout";
import { ScoreThreadDrawer } from "@/components/score/score-thread-drawer";
import { extractDomain, loadChatSession, seedChatSession, streamChat } from "@/lib/chat-client";
import { sanitizeUiBlocks, suggestionsFromBlocks, workspaceFromScore, type UiBlock } from "@/lib/gen-ui";
import { parseIncompleteCoverage, type IncompleteCoverageResult } from "@/lib/score-coverage";
import { parsePersistedPresentation, type ToolChip } from "@/lib/score-presentation";
import { SCORE_NEW_EVENT, SCORE_OPEN_THREADS_EVENT } from "@/lib/score-workspace-events";
import { CHAT_CREDIT_COST, type IntentScore, type ScoreBand } from "@/lib/types";

type ScorableIntentScore = IntentScore & { intent_score: number; score_band: ScoreBand };

export interface RecentScore {
  domain: string;
  company_name: string;
  score: number | null;
  score_band: "HOT" | "WARM" | "COLD" | null;
  created_at: string;
}

interface ScoreViewProps { creditsRemaining: number; recentScores: RecentScore[] }

type ThreadMessage =
  | { id: string; role: "user"; content: string; restored?: boolean }
  | { id: string; role: "assistant"; kind: "ui"; blocks: UiBlock[]; content: string; tools: ToolChip[]; billing?: string; restored?: boolean }
  | { id: string; role: "assistant"; kind: "text"; content: string; tools: ToolChip[]; restored?: boolean }
  | { id: string; role: "assistant"; kind: "coverage"; result: IncompleteCoverageResult }
  | { id: string; role: "assistant"; kind: "thinking"; mode: "score" | "chat"; tools: ToolChip[] }
  | { id: string; role: "error"; content: string };

function nextId() { return crypto.randomUUID(); }

function requireScorableResult(value: IntentScore): ScorableIntentScore {
  if (value.intent_score === null || value.score_band === null || value.score_status === "unscorable") {
    throw new Error("Not enough current evidence to calculate a reliable score.");
  }
  return value as ScorableIntentScore;
}

type ScoreRequestOutcome =
  | { kind: "scored"; result: ScorableIntentScore }
  | { kind: "coverage"; result: IncompleteCoverageResult };

async function requestScore(domain: string): Promise<ScoreRequestOutcome> {
  const response = await fetch("/api/v1/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain }) });
  const payload = await response.json() as unknown;
  const incomplete = parseIncompleteCoverage(payload);
  if (incomplete) return { kind: "coverage", result: incomplete };
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Scoring failed";
    throw new Error(error);
  }
  return { kind: "scored", result: requireScorableResult(payload as IntentScore) };
}

function billingLabel(result: ScorableIntentScore & { charged?: boolean; cached?: boolean }) {
  if (result.charged) return "1 credit";
  if (result.cached) return "cache hit · free";
  return "no credit charged";
}

function toolsOf(message: ThreadMessage): ToolChip[] {
  return message.role === "assistant" && "tools" in message ? message.tools : [];
}

function ToolTrace({ tools, billing }: { tools: ToolChip[]; billing?: string }) {
  const completed = tools.filter((tool) => tool.status === "done");
  if (completed.length === 0 && !billing) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {completed.length > 0 ? <><CheckCircle2 className="size-3.5" aria-hidden="true" /><span>{completed.map((tool) => tool.name.replaceAll("_", " ")).join(" · ")}</span></> : null}
      {completed.length > 0 && billing ? <span aria-hidden="true">·</span> : null}
      {billing ? <span>{billing}</span> : null}
    </p>
  );
}

function artifactLabel(blocks: UiBlock[]) {
  const hero = blocks.find((block) => block.type === "intent_hero");
  if (hero?.type === "intent_hero") return `${hero.company} · ${hero.intent_score} ${hero.score_band}`;
  if (blocks.some((block) => block.type === "comparison")) return "Account comparison";
  if (blocks.some((block) => block.type === "outreach_studio")) return "Outreach draft";
  return "Earlier result";
}

function ScoreArtifact({ message, current, handlers }: { message: Extract<ThreadMessage, { role: "assistant"; kind: "ui" }>; current: boolean; handlers: Parameters<typeof GenUiWorkspace>[0]["handlers"] }) {
  const body = <GenUiWorkspace blocks={message.blocks} handlers={handlers} />;
  if (!current) {
    return (
      <details className="score-artifact-archive rounded-lg border border-border/70 bg-muted/20">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">{artifactLabel(message.blocks)}</summary>
        <div className="border-t border-border/70 p-4">{body}</div>
      </details>
    );
  }
  return <div data-motion={message.restored ? "restored" : "generated"}>{body}</div>;
}

export function ScoreView(props: ScoreViewProps) {
  const { creditsRemaining } = props;
  const searchParams = useSearchParams();
  const autoScoredRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [watchlistByDomain, setWatchlistByDomain] = useState<Record<string, "adding" | "added">>({});

  useEffect(() => {
    const openThreads = () => setThreadsOpen(true);
    const newScore = () => resetWorkspace();
    window.addEventListener(SCORE_OPEN_THREADS_EVENT, openThreads);
    window.addEventListener(SCORE_NEW_EVENT, newScore);
    return () => { window.removeEventListener(SCORE_OPEN_THREADS_EVENT, openThreads); window.removeEventListener(SCORE_NEW_EVENT, newScore); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(() => {
    const domain = searchParams.get("domain")?.trim();
    if (!domain || autoScoredRef.current === domain) return;
    autoScoredRef.current = domain;
    void submitMessage(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function resetWorkspace() {
    if (busy) return;
    setTransitioning(true);
    window.setTimeout(() => {
      setMessages([]);
      setSessionId(null);
      autoScoredRef.current = null;
      setTransitioning(false);
    }, 180);
  }

  async function runScore(raw: string, domain: string) {
    const thinkingId = nextId();
    setMessages((current) => [...current, { id: nextId(), role: "user", content: raw }, { id: thinkingId, role: "assistant", kind: "thinking", mode: "score", tools: [] }]);
    setBusy(true);
    try {
      const outcome = await requestScore(domain);
      if (outcome.kind === "coverage") {
        setMessages((current) => current.map((message) => message.id === thinkingId
          ? { id: thinkingId, role: "assistant", kind: "coverage", result: outcome.result }
          : message));
        return;
      }
      const result = outcome.result;
      const blocks = workspaceFromScore(result);
      const billing = billingLabel(result);
      setMessages((current) => current.map((message) => message.id === thinkingId ? { id: thinkingId, role: "assistant", kind: "ui", blocks, content: "", tools: [], billing } : message));
      try {
        const id = await seedChatSession({
          sessionId: sessionId ?? undefined,
          title: result.domain,
          user: raw,
          assistant: result.ai_summary || `${result.company} scored ${result.intent_score}/100 (${result.score_band}).`,
          presentation: blocks,
          tools: [],
          billing,
        });
        setSessionId(id);
      } catch {
        // The visible score remains usable if conversation persistence is temporarily unavailable.
      }
    } catch (reason) {
      setMessages((current) => current.map((message) => message.id === thinkingId ? { id: thinkingId, role: "error", content: (reason as Error).message } : message));
    } finally {
      setBusy(false);
    }
  }

  async function runFollowUp(text: string) {
    const thinkingId = nextId();
    setMessages((current) => [...current, { id: nextId(), role: "user", content: text }, { id: thinkingId, role: "assistant", kind: "thinking", mode: "chat", tools: [] }]);
    setBusy(true);
    try {
      const nextSession = await streamChat({ message: text, session_id: sessionId ?? undefined }, (event) => {
        setMessages((currentMessages) => currentMessages.map((message) => {
          if (message.id !== thinkingId) return message;
          if (event.type === "text") {
            if (message.role === "assistant" && message.kind === "ui") return { ...message, content: message.content + event.content };
            return { id: thinkingId, role: "assistant", kind: "text", content: message.role === "assistant" && message.kind === "text" ? message.content + event.content : event.content, tools: toolsOf(message) };
          }
          if (event.type === "tool_call") {
            const tools = [...toolsOf(message), { name: event.name, status: "running" as const }];
            return message.role === "assistant" && (message.kind === "text" || message.kind === "ui") ? { ...message, tools } : { id: thinkingId, role: "assistant", kind: "thinking", mode: "chat", tools };
          }
          if (event.type === "tool_result") {
            const tools = toolsOf(message).map((tool) => tool.name === event.name && tool.status === "running" ? { ...tool, status: "done" as const, result: event.result } : tool);
            return message.role === "assistant" ? { ...message, tools } : message;
          }
          if (event.type === "ui") {
            const blocks = sanitizeUiBlocks(event.blocks);
            if (blocks.length === 0) return message;
            return { id: thinkingId, role: "assistant", kind: "ui", blocks, content: message.role === "assistant" && "content" in message ? message.content : "", tools: toolsOf(message), billing: event.billing ?? `${CHAT_CREDIT_COST} credits` };
          }
          return message;
        }));
      });
      if (nextSession) setSessionId(nextSession);
      setMessages((current) => current.map((message) => message.id === thinkingId && message.role === "assistant" && message.kind === "thinking" ? { id: thinkingId, role: "assistant", kind: "text", content: "No response was generated. Try a more specific question.", tools: message.tools } : message));
    } catch (reason) {
      setMessages((current) => current.map((message) => message.id === thinkingId ? { id: thinkingId, role: "error", content: (reason as Error).message } : message));
    } finally {
      setBusy(false);
    }
  }

  async function submitMessage(input: string) {
    const raw = input.trim();
    if (!raw || busy) return;
    const domain = extractDomain(raw);
    if (domain) await runScore(raw, domain);
    else await runFollowUp(raw);
  }

  async function restoreThread(id: string) {
    if (busy) return;
    setTransitioning(true);
    try {
      const payload = await loadChatSession(id);
      const restored = payload.messages.flatMap<ThreadMessage>((row) => {
        if (row.role === "user") return [{ id: row.id, role: "user", content: row.content, restored: true }];
        if (row.role !== "assistant") return [];
        const saved = parsePersistedPresentation(row.tool_result);
        if (saved) return [{ id: row.id, role: "assistant", kind: "ui", blocks: saved.presentation, content: row.content, tools: saved.tools, billing: saved.billing, restored: true }];
        return row.content ? [{ id: row.id, role: "assistant", kind: "text", content: row.content, tools: [], restored: true }] : [];
      });
      setMessages(restored);
      setSessionId(payload.session.id);
      autoScoredRef.current = null;
    } catch (reason) {
      setMessages([{ id: nextId(), role: "error", content: (reason as Error).message }]);
    } finally {
      window.setTimeout(() => setTransitioning(false), 180);
    }
  }

  async function addToWatchlist(company: string, domain: string) {
    setWatchlistByDomain((current) => ({ ...current, [domain]: "adding" }));
    try {
      const response = await fetch("/api/dashboard/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, company_name: company }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to add");
      setWatchlistByDomain((current) => ({ ...current, [domain]: "added" }));
    } catch {
      setWatchlistByDomain((current) => { const next = { ...current }; delete next[domain]; return next; });
    }
  }

  const uiMessages = messages.filter((message): message is Extract<ThreadMessage, { role: "assistant"; kind: "ui" }> => message.role === "assistant" && message.kind === "ui");
  const latestUiId = uiMessages.at(-1)?.id;
  const latestArtifactId = messages.findLast((message) => message.role === "assistant" && (message.kind === "ui" || message.kind === "coverage"))?.id;
  const suggestions = useMemo(() => uiMessages.length > 0 ? suggestionsFromBlocks(uiMessages.at(-1)!.blocks) : [], [uiMessages]);
  const active = messages.length > 0;

  const thread = (
    <Conversation className="score-chat-thread">
      <ConversationContent className="score-chat-col">
        {messages.map((message) => {
          if (message.role === "user") return <div key={message.id} className="score-message score-message-user ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-5 text-foreground" data-motion={message.restored ? "restored" : "submitted"}>{message.content}</div>;
          if (message.role === "error") return <div key={message.id} className="score-message flex items-start gap-2 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message.content}</div>;
          if (message.kind === "thinking") {
            const running = message.tools.findLast((tool) => tool.status === "running");
            return <div key={message.id} className="score-message"><ScoreResearchStatus mode={message.mode} />{running ? <p className="mt-2 text-xs text-muted-foreground">Using {running.name.replaceAll("_", " ")}…</p> : null}</div>;
          }
          if (message.kind === "coverage") {
            const artifact = <ScoreCoverageIncomplete result={message.result} onRetry={(domain) => void runScore(domain, domain)} onReset={resetWorkspace} />;
            if (message.id !== latestArtifactId) {
              return <details key={message.id} className="score-artifact-archive rounded-lg border border-border/70 bg-muted/20"><summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">{message.result.domain} · coverage incomplete</summary><div className="border-t border-border/70 p-4">{artifact}</div></details>;
            }
            return <div key={message.id} className="score-message" data-motion="generated">{artifact}</div>;
          }
          if (message.kind === "ui") return <div key={message.id} className="score-message space-y-4"><ToolTrace tools={message.tools} billing={message.billing} />{message.content ? <MessageResponse className="text-sm leading-6 text-foreground/85">{message.content}</MessageResponse> : null}<ScoreArtifact message={message} current={message.id === latestUiId} handlers={{ onWatchlist: (company, domain) => void addToWatchlist(company, domain), watchlistByDomain, onPrompt: (prompt) => void submitMessage(prompt) }} /></div>;
          return <div key={message.id} className="score-message space-y-3"><ToolTrace tools={message.tools} />{message.content ? <MessageResponse className="text-sm leading-6 text-foreground/85">{message.content}</MessageResponse> : null}</div>;
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );

  return (
    <div className={`score-chat transition-opacity duration-200 motion-reduce:transition-none ${transitioning ? "opacity-0" : "opacity-100"}`}>
      {!active ? <ScorePageFrame mode="entry"><ScoreEmptyState onSubmit={(value) => void submitMessage(value)} creditsRemaining={creditsRemaining} busy={busy} /></ScorePageFrame> : <ScorePageFrame mode="workspace"><ScoreWorkspaceLayout thread={thread} composer={<ScoreComposer busy={busy} suggestions={suggestions} onSubmit={(value) => void submitMessage(value)} />} /></ScorePageFrame>}
      <ScoreThreadDrawer open={threadsOpen} onOpenChange={setThreadsOpen} onSelect={(id) => void restoreThread(id)} activeId={sessionId} />
    </div>
  );
}
