"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import type { InboxNotification } from "@/lib/types";
import { Mail, Archive, Clock, MoreHorizontal, ExternalLink, Users } from "lucide-react";

interface InboxDetailProps {
  notification: InboxNotification | null;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onSnooze: (id: string) => void;
  onArchive: (id: string) => void;
}

function avatarIndex(name: string) {
  const n = name.charCodeAt(0) % 10;
  return n === 0 ? 10 : n;
}

function EventCard({ n }: { n: InboxNotification }) {
  const meta = n.metadata;
  const deltas = (meta.signal_deltas as Record<string, number>) ?? {};
  const scoreBand = (meta.score_band as string) ?? "";
  const scoreAfter = (meta.score_after as number) ?? 0;
  const scoreBefore = (meta.score_before as number) ?? 0;
  const scoreDelta = scoreAfter - scoreBefore;

  const bandClass = scoreBand === "HOT" ? "hot" : scoreBand === "WARM" ? "warm" : "cold";

  return (
    <div className="event-card" style={{ marginBottom: 20 }}>
      <div className="event-card-head">
        <div className={cn("ic", bandClass)}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
            <path d="M7 1c1.5 2.5 3.5 4 3.5 7a3.5 3.5 0 11-7 0c0-1.5 1-2.5 1-4l1.5-3" />
          </svg>
        </div>
        <div className="body">
          <div className="title">
            {n.company_name} moved to {scoreBand} {scoreAfter}
          </div>
          <div className="sub">
            Crossed your {scoreBand} threshold · {n.tags.filter(t => t !== scoreBand).join(", ")} signal{n.tags.length > 1 ? "s" : ""} lit
          </div>
        </div>
        <span className={cn("band", `band-${scoreBand.toLowerCase()}`)}>
          <span className="dot" />
          {scoreBand} {scoreAfter}
        </span>
      </div>

      <div className="event-rows">
        <div className="event-stat">
          <div className="lab">Score</div>
          <div className="val">{scoreAfter} / 100</div>
          <div className="delta" style={{ color: scoreDelta >= 0 ? "var(--hot)" : "var(--text-tertiary)" }}>
            {scoreDelta >= 0 ? `▲ ${scoreDelta}` : `▼ ${Math.abs(scoreDelta)}`}
          </div>
        </div>
        <div className="event-stat">
          <div className="lab">Funding</div>
          <div className="val">{deltas.funding ?? 0}</div>
          <div className="delta" style={{ color: (deltas.funding ?? 0) > 0 ? "var(--hot)" : "var(--text-tertiary)" }}>
            {(deltas.funding ?? 0) > 0 ? `▲ ${deltas.funding}` : "—"}
          </div>
        </div>
        <div className="event-stat">
          <div className="lab">News</div>
          <div className="val">{deltas.news ?? 0}</div>
          <div className="delta" style={{ color: (deltas.news ?? 0) > 0 ? "var(--hot)" : "var(--text-tertiary)" }}>
            {(deltas.news ?? 0) > 0 ? `▲ ${deltas.news}` : "—"}
          </div>
        </div>
        <div className="event-stat">
          <div className="lab">Hiring</div>
          <div className="val">{deltas.hiring ?? 0}</div>
          <div className="delta" style={{ color: (deltas.hiring ?? 0) > 0 ? "var(--hot)" : "var(--text-tertiary)" }}>
            {(deltas.hiring ?? 0) > 0 ? `▲ ${deltas.hiring}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatChangedTimeline({ n }: { n: InboxNotification }) {
  const deltas = (n.metadata.signal_deltas as Record<string, number>) ?? {};
  const entries = Object.entries(deltas).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;

  const ringMap: Record<string, string> = {
    funding: "hot",
    news: "warm",
    hiring: "warm",
    technology: "blue",
    web: "blue",
  };

  return (
    <>
      <div className="msg-section-label">
        <span style={{ width: 5, height: 5, borderRadius: "999px", background: "var(--text-tertiary)", display: "inline-block" }} />
        What changed
        <span className="line" />
      </div>
      <div>
        {entries.map(([signal, val]) => {
          const ringClass = ringMap[signal] ?? "blue";
          return (
            <div key={signal} className="sub-event">
              <div className={cn("ring", ringClass)} />
              <div>
                <div className="text">
                  <strong style={{ textTransform: "capitalize" }}>{signal} signal</strong> active · strength {val}
                </div>
                <div className="meta">
                  Signal score: {val} / 25
                </div>
              </div>
              <div className="ts">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })} ago
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function InboxDetail({
  notification: n,
  onMarkRead,
  onMarkUnread,
  onSnooze,
  onArchive,
}: InboxDetailProps) {
  const router = useRouter();

  if (!n) {
    return (
      <div className="msg-detail" style={{ display: "grid", placeItems: "center" }}>
        <div className="inbox-empty">
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Select a notification</div>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
            Choose an item from the list to view details
          </div>
        </div>
      </div>
    );
  }

  const hasEventCard = n.event_type === "hot_crossing" || n.event_type === "stage_change";
  const aiThesis = n.metadata.ai_thesis as string | undefined;
  const recommendedAction = n.metadata.recommended_action as string | undefined;
  const companyInitials = n.company_name.slice(0, 1).toUpperCase();
  const avIdx = avatarIndex(n.company_name);
  const shortId = n.id.slice(0, 8).toUpperCase();
  const relTime = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

  return (
    <div className="msg-detail">
      {/* ── Head: actions + title + from-row ─────────────────────────── */}
      <div className="msg-detail-head">
        <div className="msg-detail-actions">
          <button
            type="button"
            className="tb-btn outlined"
            onClick={() => (n.is_read ? onMarkUnread(n.id) : onMarkRead(n.id))}
          >
            <Mail className="ic" />
            {n.is_read ? "Mark unread" : "Mark read"}
          </button>
          <button
            type="button"
            className="tb-btn outlined"
            onClick={() => onSnooze(n.id)}
          >
            <Clock className="ic" />
            Snooze 1h
          </button>
          <button
            type="button"
            className="tb-btn outlined"
            onClick={() => onArchive(n.id)}
          >
            <Archive className="ic" />
            Archive
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="tb-btn outlined">
            <MoreHorizontal className="ic" />
          </button>
        </div>

        <h1>{n.title}</h1>

        <div className="msg-from-row">
          <div className={cn("msg-from-av", `av-${avIdx}`)}>{companyInitials}</div>
          <div className="msg-from-info">
            <div className="msg-from-name">VesperWise · {n.domain}</div>
            <div className="msg-from-meta">
              {n.tags.join(" · ")}
              {n.list_id ? " · subscribed via list" : ""}
            </div>
          </div>
          <div className="msg-from-ts">{relTime}</div>
        </div>
      </div>

      {/* ── Body: event card + AI thesis + actions + timeline ────────── */}
      <div className="msg-body">

        {/* Event card */}
        {hasEventCard && <EventCard n={n} />}

        {/* AI Thesis */}
        {aiThesis && (
          <>
            <div className="msg-section-label">
              <span style={{ width: 5, height: 5, borderRadius: "999px", background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)", display: "inline-block", flexShrink: 0 }} />
              AI thesis
              <span className="line" />
            </div>
            <div className="msg-text-block">{aiThesis}</div>
          </>
        )}

        {/* Recommended action */}
        {recommendedAction && (
          <div className="msg-text-block" style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 0 }}>
            Recommended next action: {recommendedAction}
          </div>
        )}

        {/* If no metadata, show summary as body text */}
        {!aiThesis && !hasEventCard && (
          <div className="msg-text-block">{n.summary}</div>
        )}

        {/* Reply actions */}
        <div className="reply-actions" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="reply-btn"
            onClick={() => router.push(`/score?company=${encodeURIComponent(n.domain)}`)}
          >
            <Mail className="ic" />
            Draft outreach
          </button>
          <button
            type="button"
            className="reply-btn"
            onClick={() => router.push(`/score?company=${encodeURIComponent(n.domain)}`)}
          >
            <ExternalLink className="ic" />
            Open account
          </button>
          <button
            type="button"
            className="reply-btn"
            onClick={() => router.push(`/people?company=${encodeURIComponent(n.domain)}`)}
          >
            <Users className="ic" />
            View people
          </button>
        </div>

        {/* What Changed */}
        <WhatChangedTimeline n={n} />

      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="msg-footer">
        <div className="left">
          <span className="mono">IQ-{shortId}</span>
          <span>·</span>
          {n.list_id
            ? <span>Subscribed via list</span>
            : <span>Direct alert</span>
          }
          <span>·</span>
          <span>{format(new Date(n.created_at), "MMM d, yyyy")}</span>
        </div>
        <div className="right">
          <button type="button" className="tb-btn outlined">Unsubscribe</button>
          <button
            type="button"
            className="btn-primary"
            style={{ height: 30, padding: "0 12px" }}
            onClick={() => router.push(`/score?company=${encodeURIComponent(n.domain)}`)}
          >
            Open {n.company_name} →
          </button>
        </div>
      </div>
    </div>
  );
}
