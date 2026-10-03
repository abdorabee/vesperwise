"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ShellPanel } from "@/components/dashboard/shell/shell-panel";
import { ScoreComposer } from "@/components/score/score-composer";
import { ScoreConversationThread } from "@/components/score/score-conversation-thread";
import { ScoreEmptyState } from "@/components/score/score-empty-state";
import type { ScoreFailure } from "@/components/score/score-error-card";
import { buildScoreReport, ScoreReportPanel } from "@/components/score/score-report-panel";
import type { ScoreReport } from "@/components/score/score-report-model";
import { applyResearchEvent, EMPTY_RESEARCH_PROGRESS } from "@/components/score/score-research-status";
import type { ScoreUiThreadMessage, ThreadMessage } from "@/components/score/score-thread-types";
import { ScoreWorkspaceReportHeader } from "@/components/score/score-workspace-report-header";
import { ScorePageFrame, ScoreWorkspaceLayout } from "@/components/score/score-workspace-layout";
import { ScoreThreadDrawer } from "@/components/score/score-thread-drawer";
import { useScoreReportState } from "@/components/score/use-score-report-state";
import { extractDomain, loadChatSession, seedChatSession, streamChat } from "@/lib/chat-client";
import { sanitizeUiBlocks, suggestionsFromBlocks, workspaceFromScore } from "@/lib/gen-ui";
import { parseIncompleteCoverage, type IncompleteCoverageResult } from "@/lib/score-coverage";
import { parsePersistedPresentation, type ToolChip } from "@/lib/score-presentation";
import { createSseParser, type ScoreProgressEvent } from "@/lib/score-progress";
import { SCORE_NEW_EVENT, SCORE_OPEN_THREADS_EVENT } from "@/lib/score-workspace-events";
import type { StoredWorkspaceScore } from "@/lib/stored-score";
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

class ScoreRequestError extends Error {
  constructor(readonly failure: ScoreFailure) {
    super(failure.message);
  }
}

function failureFrom(status: number, payload: unknown): ScoreFailure {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const message = typeof record.message === "string" ? record.message : typeof record.error === "string" ? record.error : "Scoring failed";
  return {
    status,
    code: typeof record.code === "string" ? record.code : undefined,
    message,
    creditsRemaining: typeof record.credits_remaining === "number" ? record.credits_remaining : undefined,
    retryAfterSeconds: typeof record.retry_after_seconds === "number" ? record.retry_after_seconds : undefined,
  };
}

function outcomeFrom(ok: boolean, status: number, payload: unknown): ScoreRequestOutcome {
  const incomplete = parseIncompleteCoverage(payload);
  if (incomplete) return { kind: "coverage", result: incomplete };
  if (!ok) throw new ScoreRequestError(failureFrom(status, payload));
  return { kind: "scored", result: requireScorableResult(payload as IntentScore) };
}

/**
 * Requests a score as a server-sent event stream so each provider's real
 * completion can fill its row. Falls back to the plain JSON body when the
 * server answers without a stream (auth/validation errors).
 */
async function requestScore(domain: string, onProgress: (event: ScoreProgressEvent) => void): Promise<ScoreRequestOutcome> {
  const response = await fetch("/api/v1/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ domain }),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const payload = await response.json().catch(() => null) as unknown;
    return outcomeFrom(response.ok, response.status, payload);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser();
  let final: { ok: boolean; status: number; payload: unknown } | null = null;
  while (!final) {
    const { value, done } = await reader.read();
    const messages = parse(done ? decoder.decode() : decoder.decode(value, { stream: true }));
    for (const message of messages) {
      let data: unknown;
      try { data = JSON.parse(message.data); } catch { continue; }
      if (message.event === "progress") onProgress(data as ScoreProgressEvent);
      else if (message.event === "result") final = { ok: true, status: 200, payload: data };
      else if (message.event === "error") {
        const status = data && typeof data === "object" && typeof (data as { status?: unknown }).status === "number" ? (data as { status: number }).status : 500;
        final = { ok: false, status, payload: data };
      }
    }
    if (done) break;
  }
  if (!final) throw new ScoreRequestError({ status: 0, message: "The connection closed before the score finished. Retry to load it — a completed score is stored." });
  return outcomeFrom(final.ok, final.status, final.payload);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function billingLabel(result: ScorableIntentScore & { charged?: boolean; cached?: boolean }) {
  if (result.charged) return "1 credit";
  if (result.cached) return "cache hit · free";
  return "no credit charged";
}

function toolsOf(message: ThreadMessage): ToolChip[] {
  return message.role === "assistant" && "tools" in message ? message.tools : [];
}

export function ScoreView(props: ScoreViewProps) {
  const { creditsRemaining, recentScores } = props;
  const searchParams = useSearchParams();
  const autoScoredRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [watchlistByDomain, setWatchlistByDomain] = useState<Record<string, "adding" | "added">>({});
  // A restored result has no chat session yet; seed one lazily on the first follow-up.
  const pendingSeedRef = useRef<Parameters<typeof seedChatSession>[0] | null>(null);

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
    const view = searchParams.get("view");
    const key = `${domain}|${view ?? ""}`;
    if (!domain || autoScoredRef.current === key) return;
    autoScoredRef.current = key;
    if (view === "last") void openLastScore(domain);
    else void submitMessage(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function resetWorkspace() {
    if (busy) return;
    setTransitioning(true);
    window.setTimeout(() => {
      setMessages([]);
      setSessionId(null);
      pendingSeedRef.current = null;
      autoScoredRef.current = null;
      setReportPanelOpen(false);
      setSelectedReportId(null);
      setTransitioning(false);
    }, 180);
  }

  async function runScore(raw: string, domain: string) {
    const thinkingId = nextId();
    setMessages((current) => [...current, { id: nextId(), role: "user", content: raw }, { id: thinkingId, role: "assistant", kind: "thinking", mode: "score", tools: [], progress: EMPTY_RESEARCH_PROGRESS, domain }]);
    setBusy(true);
    const onProgress = (event: ScoreProgressEvent) => {
      setMessages((current) => current.map((message) => message.id === thinkingId && message.role === "assistant" && message.kind === "thinking"
        ? { ...message, progress: applyResearchEvent(message.progress ?? EMPTY_RESEARCH_PROGRESS, event) }
        : message));
    };
    try {
      let outcome: ScoreRequestOutcome;
      try {
        outcome = await requestScore(domain, onProgress);
      } catch (reason) {
        // Another request is already scoring this domain: wait as told, then retry once.
        const retryAfter = reason instanceof ScoreRequestError && reason.failure.status === 409 ? reason.failure.retryAfterSeconds : undefined;
        if (retryAfter === undefined) throw reason;
        await wait(Math.min(10, Math.max(1, retryAfter)) * 1000);
        outcome = await requestScore(domain, onProgress);
      }
      if (outcome.kind === "coverage") {
        const result = outcome.result;
        setMessages((current) => current.map((message) => message.id === thinkingId
          ? { id: thinkingId, role: "assistant", kind: "coverage", result }
          : message));
        return;
      }
      const result = outcome.result;
      const blocks = workspaceFromScore(result);
      const billing = billingLabel(result);
      setMessages((current) => current.map((message) => message.id === thinkingId ? { id: thinkingId, role: "assistant", kind: "ui", blocks, content: "", tools: [], billing } : message));
      pendingSeedRef.current = null;
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
      const failure: ScoreFailure = reason instanceof ScoreRequestError ? reason.failure : { status: 0, message: (reason as Error).message || "Scoring failed" };
      setMessages((current) => current.map((message) => message.id === thinkingId ? { id: thinkingId, role: "error", content: failure.message, failure, domain } : message));
    } finally {
      setBusy(false);
    }
  }

  /** Restores the last stored score for a domain without rescoring or charging. */
  async function openLastScore(rawDomain: string) {
    if (busy) return;
    const domain = extractDomain(rawDomain) ?? rawDomain;
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/scores/latest?domain=${encodeURIComponent(domain)}`);
      const payload = await response.json().catch(() => null) as { score?: StoredWorkspaceScore; error?: string } | null;
      if (response.status === 404) {
        const message = payload?.error ?? "No stored score yet";
        setMessages([{ id: nextId(), role: "error", content: message, failure: { status: 404, code: "no_stored_score", message }, domain }]);
        return;
      }
      if (!response.ok || !payload?.score) throw new Error(payload?.error ?? "Couldn't load the stored score");
      const stored = payload.score;
      const blocks = workspaceFromScore(stored);
      const assistant = stored.ai_summary || `${stored.company} scored ${stored.intent_score}/100 (${stored.score_band}).`;
      setSessionId(null);
      pendingSeedRef.current = { title: stored.domain, user: stored.domain, assistant, presentation: blocks, tools: [], billing: "stored result · free" };
      setMessages([{ id: nextId(), role: "assistant", kind: "ui", blocks, content: "", tools: [], billing: "stored result · free", restored: true, stored: { domain: stored.domain, createdAt: stored.created_at } }]);
    } catch (reason) {
      const message = (reason as Error).message || "Couldn't load the stored score";
      setMessages([{ id: nextId(), role: "error", content: message, failure: { status: 0, message }, domain }]);
    } finally {
      setBusy(false);
    }
  }

  async function runFollowUp(text: string) {
    const thinkingId = nextId();
    setMessages((current) => [...current, { id: nextId(), role: "user", content: text }, { id: thinkingId, role: "assistant", kind: "thinking", mode: "chat", tools: [] }]);
    setBusy(true);
    try {
      let activeSession = sessionId;
      if (!activeSession && pendingSeedRef.current) {
        try {
          activeSession = await seedChatSession(pendingSeedRef.current);
          setSessionId(activeSession);
        } catch {
          // Follow-ups still work without the restored context.
        }
        pendingSeedRef.current = null;
      }
      const nextSession = await streamChat({ message: text, session_id: activeSession ?? undefined }, (event) => {
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
      pendingSeedRef.current = null;
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
  const reportSources = useMemo(() => messages.filter((message): message is Extract<ThreadMessage, { role: "assistant"; kind: "ui" | "thinking" }> => (
    message.role === "assistant" && (message.kind === "ui" || (message.kind === "thinking" && message.mode === "score"))
  )), [messages]);
  const { reports, selectedReport, setSelectedReportId, reportPanelOpen, setReportPanelOpen } = useScoreReportState(reportSources);
  const reportHandlers = {
    onWatchlist: (company: string, domain: string) => void addToWatchlist(company, domain),
    watchlistByDomain,
    onPrompt: (prompt: string) => void submitMessage(prompt),
  };
  const active = messages.length > 0;
  const activeStreamingMessageId = busy
    ? messages.findLast((message) => message.role === "assistant" && (message.kind === "thinking" || message.kind === "text" || message.kind === "ui"))?.id ?? null
    : null;

  function reportForMessage(message: ScoreUiThreadMessage) {
    return reports.find((report): report is Extract<ScoreReport, { kind: "ui" }> => report.kind === "ui" && report.messageId === message.id)
      ?? buildScoreReport(message.id, message.blocks, { current: message.id === latestUiId, restored: message.restored, stored: message.stored });
  }

  function openReport(report: Extract<ScoreReport, { kind: "ui" }>) {
    const target = reports.find((item) => item.id === report.id)
      ?? (report.domain ? reports.find((item) => item.domain?.toLowerCase() === report.domain?.toLowerCase()) : null);
    if (!target) return;
    setSelectedReportId(target.id);
    setReportPanelOpen(true);
  }

  const workspaceHeader = <ScoreWorkspaceReportHeader reports={reports} selectedReport={selectedReport} onSelect={setSelectedReportId} onOpen={() => selectedReport && setReportPanelOpen(true)} />;

  const thread = <ScoreConversationThread messages={messages} latestArtifactId={latestArtifactId} activeStreamingMessageId={activeStreamingMessageId} reportForMessage={reportForMessage} onOpenReport={openReport} onRetryScore={(domain) => void runScore(domain, domain)} onReset={resetWorkspace} />;

  return (
    <div className={`score-chat transition-opacity duration-200 motion-reduce:transition-none ${transitioning ? "opacity-0" : "opacity-100"}`}>
      {!active ? <ScorePageFrame mode="entry"><ScoreEmptyState onSubmit={(value) => void submitMessage(value)} onOpenRecent={(domain) => void openLastScore(domain)} recentScores={recentScores} creditsRemaining={creditsRemaining} busy={busy} /></ScorePageFrame> : <ScorePageFrame mode="workspace"><ScoreWorkspaceLayout header={workspaceHeader} thread={thread} composer={<ScoreComposer busy={busy} suggestions={suggestions} onSubmit={(value) => void submitMessage(value)} />} /></ScorePageFrame>}
      <ScoreThreadDrawer open={threadsOpen} onOpenChange={setThreadsOpen} onSelect={(id) => void restoreThread(id)} activeId={sessionId} />
      {selectedReport ? (
        <ShellPanel open={reportPanelOpen} size="wide" label="Score report" onClose={() => setReportPanelOpen(false)}>
          <ScoreReportPanel report={selectedReport} handlers={reportHandlers} busy={busy} onClose={() => setReportPanelOpen(false)} onRescore={(domain) => void runScore(domain, domain)} />
        </ShellPanel>
      ) : null}
    </div>
  );
}
