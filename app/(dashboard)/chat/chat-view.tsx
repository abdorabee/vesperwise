"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Orb } from "@/components/score/activity-orb";
import { ScoreRecord } from "@/components/score/score-record";
import { ScoreResultsTable } from "@/components/score/score-results-table";
import VesperWiseLogo from "@/components/vesperwise-logo";
import { listChatSessions, loadChatSession, streamChat, type ChatSessionSummary } from "@/lib/chat-client";
import { isScorePayload, recordFromCompany, recordFromPerson, type ScoreRecordData } from "@/lib/score-record";
import { parseScoreTarget } from "@/lib/score-target";
import type { IntentScore, PersonIntentScore, ScoreBand } from "@/lib/types";
import "@/components/score/score-surfaces.css";

type Turn =
  | { id: string; role: "user"; content: string; at: string }
  | { id: string; role: "assistant"; content: string; records: ScoreRecordData[]; confirm?: string; at: string; streaming?: boolean };

const STARTERS = [
  "Score acme.com",
  "Score alex@acme.com",
  "Who in the watchlist crossed 75 this week?",
];

export function ChatView({ creditsRemaining }: { creditsRemaining: number }) {
  const [credits, setCredits] = useState(creditsRemaining);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [openTurnId, setOpenTurnId] = useState<string | null>(null);
  const [orb, setOrb] = useState<"S1" | "S4" | "S3">("S1");
  const [orbLabel, setOrbLabel] = useState("Thinking…");
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const target = parseScoreTarget(draft);

  useEffect(() => {
    void listChatSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, busy]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && busy) abortRef.current?.abort();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);

  const groups = useMemo(() => groupSessions(sessions.filter((session) => session.title.toLowerCase().includes(query.trim().toLowerCase()))), [sessions, query]);
  const openTurn = openTurnFrom(turns, openTurnId);

  function fill(text: string) {
    setDraft(text);
  }

  async function openSession(id: string) {
    setSessionId(id);
    const loaded = await loadChatSession(id).catch(() => null);
    if (!loaded) return;
    setTurns(loaded.messages.flatMap((message) => {
      if (message.role === "tool") return [];
      return [{ id: message.id, role: message.role === "assistant" ? "assistant" as const : "user" as const, content: message.content, records: [], at: message.created_at }];
    }));
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy || credits <= 0) return;
    if (needsAutopilotConfirm(message)) {
      setTurns((current) => [...current, { id: crypto.randomUUID(), role: "user", content: message, at: new Date().toISOString() }, { id: crypto.randomUUID(), role: "assistant", content: "Confirm before this watch is queued.", records: [], confirm: message, at: new Date().toISOString() }]);
      setDraft("");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = crypto.randomUUID();
    setTurns((current) => [...current, { id: crypto.randomUUID(), role: "user", content: message, at: new Date().toISOString() }, { id: assistantId, role: "assistant", content: "", records: [], at: new Date().toISOString(), streaming: true }]);
    setDraft("");
    setBusy(true);
    setOrb("S1");
    setOrbLabel("Thinking…");
    const records: ScoreRecordData[] = [];
    try {
      const nextSession = await streamChat({ message, session_id: sessionId }, (event) => {
        if (event.type === "text") {
          setTurns((current) => current.map((turn) => turn.id === assistantId && turn.role === "assistant" ? { ...turn, content: turn.content + event.content } : turn));
        }
        if (event.type === "tool_call" && (event.name === "score_company" || event.name === "score_person")) {
          const domain = typeof event.args.domain === "string" ? event.args.domain : typeof event.args.email === "string" ? event.args.email : "account";
          setOrb("S4");
          setOrbLabel(`Scoring ${domain}…`);
        }
        if (event.type === "tool_result") {
          const record = recordFromTool(event.name, event.result);
          if (record) {
            records.push(record);
            setOpenTurnId(assistantId);
            setTurns((current) => current.map((turn) => turn.id === assistantId && turn.role === "assistant" ? { ...turn, records: [...records] } : turn));
          }
        }
      }, controller.signal);
      if (nextSession) setSessionId(nextSession);
      setCredits((count) => Math.max(0, count - 1));
      const listed = await listChatSessions().catch(() => sessions);
      setSessions(listed);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setTurns((current) => current.map((turn) => turn.id === assistantId && turn.role === "assistant" ? { ...turn, content: turn.content || (err as Error).message } : turn));
    } finally {
      setBusy(false);
      setTurns((current) => current.map((turn) => turn.id === assistantId && turn.role === "assistant" ? { ...turn, streaming: false } : turn));
    }
  }

  return (
    <div className={`chat-shell${railOpen ? " is-rail-open" : ""}`}>
      <button type="button" className="chat-rail-toggle" aria-expanded={railOpen} onClick={() => setRailOpen((open) => !open)}>
        {railOpen ? "Hide threads" : "Threads"}
      </button>
      <aside className="chat-rail">
        <button type="button" className="chat-new" onClick={() => { setSessionId(undefined); setTurns([]); setOpenTurnId(null); }}>New chat</button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search threads" aria-label="Search threads" />
        {groups.map((group) => (
          <div key={group.label}>
            <p className="chat-group">{group.label}</p>
            {group.items.map((session) => (
              <button key={session.id} type="button" className={`chat-row${session.id === sessionId ? " is-on" : ""}`} onClick={() => void openSession(session.id)}>
                <span>{session.title}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div className={`chat-stage${openTurn ? " has-artifact" : ""}`}>
      <section className="chat-main">
        <div className="chat-log" ref={logRef}>
          {turns.length === 0 ? (
            <div className="chat-starters">
              {STARTERS.map((starter) => <button key={starter} type="button" onClick={() => fill(starter)}>{starter}</button>)}
              <p className="chat-hint">{credits} credits left. Cache hits are free.</p>
            </div>
          ) : turns.map((turn) => (
            <div key={turn.id} className={`chat-turn${turn.role === "user" ? " is-user" : ""}`}>
              {turn.role === "assistant" ? <VesperWiseLogo size={20} /> : null}
              <div className={turn.role === "user" ? "chat-user" : "chat-assistant"}>
                {turn.role === "assistant" && turn.streaming && !turn.content ? <Orb variant={orb} size={18} pill label={orbLabel} /> : null}
                {turn.content ? <p className="chat-copy">{turn.content}</p> : null}
                {turn.role === "assistant" && turn.records.length > 0 ? (
                  <button type="button" className="chat-artifact-chip" onClick={() => setOpenTurnId(turn.id)}>
                    {turn.records.length === 1 ? `${turn.records[0].target}  ${turn.records[0].score} ${turn.records[0].band}` : `${turn.records.length} scores`}
                  </button>
                ) : null}
                {turn.role === "assistant" && turn.confirm ? (
                  <div className="chat-confirm">
                    <p>Queue this watch? Autopilot stays off until you confirm.</p>
                    <button type="button" className="chat-send" onClick={() => void send(`Confirm watch: ${turn.confirm}`)}>Confirm</button>
                  </div>
                ) : null}
                <span className="chat-time">{new Date(turn.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="chat-composer-wrap">
          <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
            {target.mode !== "unknown" ? <p className="chat-chip">Will score {target.mode === "person" ? target.email : target.domain}. 1 credit.</p> : null}
            <textarea
              rows={1}
              value={draft}
              disabled={credits <= 0}
              placeholder={credits <= 0 ? "0 credits left" : "Paste a domain or email, or ask why an account is HOT…"}
              aria-label="Chat message"
              onChange={(event) => {
                setDraft(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <div className="chat-composer-row">
              <span className="chat-hint">Enter sends. Shift+Enter adds a line.</span>
              <button type="button" className="chat-send" onClick={() => busy ? abortRef.current?.abort() : void send(draft)}>{busy ? "Stop" : "Send"}</button>
            </div>
          </form>
        </div>
      </section>
      {openTurn && openTurn.role === "assistant" ? (
        <aside className="chat-artifact" aria-label="Score">
          <button type="button" className="chat-artifact-close" onClick={() => setOpenTurnId(null)}>
            <span className="chat-artifact-back">Back</span>
            <span className="chat-artifact-dismiss">Close</span>
          </button>
          {openTurn.records.length === 1 ? <ScoreRecord record={openTurn.records[0]} /> : <ScoreResultsTable rows={openTurn.records} />}
        </aside>
      ) : null}
      </div>
    </div>
  );
}

function openTurnFrom(turns: Turn[], id: string | null): Extract<Turn, { role: "assistant" }> | null {
  if (!id) return null;
  const turn = turns.find((item) => item.id === id);
  return turn && turn.role === "assistant" && turn.records.length > 0 ? turn : null;
}

function needsAutopilotConfirm(message: string) {
  return /\b(autopilot|ping me|notify me|watch this)\b/i.test(message) && !message.startsWith("Confirm watch:");
}

function recordFromTool(name: string, result: unknown): ScoreRecordData | null {
  if (!isScorePayload(result)) return null;
  if (name === "score_person") return recordFromPerson(result as PersonIntentScore);
  if (name === "score_company") return recordFromCompany(result as IntentScore & { intent_score: number; score_band: ScoreBand });
  return null;
}

function groupSessions(sessions: ChatSessionSummary[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(startOfToday);
  week.setDate(week.getDate() - 7);
  const buckets = [
    { label: "Today", items: [] as ChatSessionSummary[] },
    { label: "Yesterday", items: [] as ChatSessionSummary[] },
    { label: "Last week", items: [] as ChatSessionSummary[] },
  ];
  for (const session of sessions) {
    const when = new Date(session.updated_at);
    if (when >= startOfToday) buckets[0].items.push(session);
    else if (when >= yesterday) buckets[1].items.push(session);
    else if (when >= week) buckets[2].items.push(session);
  }
  return buckets.filter((bucket) => bucket.items.length > 0);
}
