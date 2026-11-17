"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ThinkingOrb } from "@/components/score/thinking-orb";
import { listChatSessions, type ChatSessionSummary } from "@/lib/chat-client";
import { Button } from "@/components/ui/button";
import { dedupeSessionsByDomain, displayThreadTitle, domainOfTitle, isStaleScore, STALE_SCORE_DAYS } from "@/components/score/recent-scores";
import { formatRelativeTime } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const GROUPS = ["Today", "This week", "Earlier"] as const;

export type ScoreThreadGroupLabel = (typeof GROUPS)[number];

export interface ScoreThreadGroup {
  label: ScoreThreadGroupLabel;
  sessions: ChatSessionSummary[];
}

function startOfLocalDay(ms: number) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function timestampOf(session: ChatSessionSummary) {
  const ms = new Date(session.updated_at).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function groupScoreThreads(
  sessions: ChatSessionSummary[],
  now = Date.now(),
): ScoreThreadGroup[] {
  const todayStart = startOfLocalDay(now);
  const weekStart = todayStart - 6 * DAY;
  const buckets: Record<ScoreThreadGroupLabel, ChatSessionSummary[]> = {
    Today: [],
    "This week": [],
    Earlier: [],
  };

  for (const session of dedupeSessionsByDomain(sessions).sort((a, b) => timestampOf(b) - timestampOf(a))) {
    const updated = timestampOf(session);
    const label: ScoreThreadGroupLabel = updated >= todayStart
      ? "Today"
      : updated >= weekStart
        ? "This week"
        : "Earlier";
    buckets[label].push(session);
  }

  return GROUPS
    .map((label) => ({ label, sessions: buckets[label] }))
    .filter((group) => group.sessions.length > 0);
}

interface ScoreThreadListProps {
  activeId: string | null;
  busy?: boolean;
  enabled?: boolean;
  error?: string;
  loading?: boolean;
  now?: number;
  sessions?: ChatSessionSummary[];
  onSelect: (id: string) => void;
  /** Starts a paid rescore through the page's confirm step; never scores on its own. */
  onRescore?: (domain: string) => void;
}

function PendingThreadRow() {
  return (
    <div
      data-slot="score-thread-pending"
      className="flex w-full items-start gap-3 rounded-lg bg-muted/60 px-3 py-3 text-left"
      aria-current="page"
    >
      <ThinkingOrb label="Saving score thread" size={12} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">New thread</span>
        <span className="mt-1 block text-xs text-muted-foreground">Saving conversation</span>
      </span>
    </div>
  );
}

interface ThreadRowProps {
  session: ChatSessionSummary;
  active: boolean;
  busy: boolean;
  now?: number;
  onSelect: (id: string) => void;
  onRescore?: (domain: string) => void;
}

function ThreadRow({ session, active, busy, now, onSelect, onRescore }: ThreadRowProps) {
  const rel = formatRelativeTime(session.updated_at, now) ?? "Unknown";
  const stale = isStaleScore(session.updated_at, now);
  const domain = domainOfTitle(session.title);
  return (
    <div className={cn("flex w-full items-start rounded-lg transition-colors duration-150 hover:bg-muted motion-reduce:transition-none", active && "bg-muted text-foreground")}>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        onClick={() => onSelect(session.id)}
      >
        <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{displayThreadTitle(session.title)}</span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {rel}
            {stale ? <span title={`Last scored more than ${STALE_SCORE_DAYS} days ago`} className="rounded border border-border px-1 py-px text-[10px] font-medium uppercase tracking-wide">Stale</span> : null}
          </span>
        </span>
        {busy && active ? (
          <span data-slot="score-thread-busy" className="mt-0.5">
            <ThinkingOrb label="Scoring active thread" size={12} />
          </span>
        ) : null}
      </button>
      {onRescore && domain ? (
        <Button type="button" size="xs" variant="ghost" disabled={busy} className="mr-2 mt-2.5 shrink-0" aria-label={`Rescore ${domain} · 1 credit`} onClick={() => onRescore(domain)}>
          Rescore · 1 credit
        </Button>
      ) : null}
    </div>
  );
}

export function ScoreThreadList({
  activeId,
  busy = false,
  enabled = true,
  error,
  loading,
  now,
  sessions,
  onSelect,
  onRescore,
}: ScoreThreadListProps) {
  const [loadedSessions, setLoadedSessions] = useState<ChatSessionSummary[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState("");
  const controlled = sessions !== undefined;

  useEffect(() => {
    if (controlled || !enabled) return undefined;
    let cancelled = false;

    async function load() {
      setInternalLoading(true);
      setInternalError("");
      try {
        const next = await listChatSessions();
        if (!cancelled) setLoadedSessions(next);
      } catch (reason) {
        if (!cancelled) setInternalError((reason as Error).message);
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeId, controlled, enabled]);

  const visibleSessions = sessions ?? loadedSessions;
  const isLoading = loading ?? internalLoading;
  const errorMessage = error ?? internalError;
  const groups = useMemo(
    () => groupScoreThreads(visibleSessions, now),
    [now, visibleSessions],
  );

  if (isLoading) {
    return (
      <div data-slot="score-thread-loading" className="space-y-3 p-2">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <p className="p-3 text-sm text-destructive" role="alert">
        {errorMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {busy && !activeId ? <PendingThreadRow /> : null}
      {visibleSessions.length === 0 && !(busy && !activeId) ? (
        <p className="p-3 text-sm text-muted-foreground">No saved score threads yet.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="space-y-1">
          <h3 className="px-2 text-[0.68rem] font-semibold uppercase tracking-normal text-muted-foreground">
            {group.label}
          </h3>
          {group.sessions.map((session) => (
            <ThreadRow key={session.id} session={session} active={session.id === activeId} busy={busy} now={now} onSelect={onSelect} onRescore={onRescore} />
          ))}
        </section>
      ))}
    </div>
  );
}
