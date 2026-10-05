"use client";

import { cn } from "@/lib/utils";
import type { InboxNotification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Filter } from "lucide-react";

type ViewFilter = "inbox" | "subscribed" | "read" | "snoozed";

const VIEW_LABELS: Record<ViewFilter, string> = {
  inbox: "Inbox",
  subscribed: "All Activity",
  read: "Read",
  snoozed: "Snoozed",
};

interface InboxListProps {
  notifications: InboxNotification[];
  selectedId: string | null;
  loading: boolean;
  unreadCount: number;
  activeView: ViewFilter;
  onSelect: (id: string) => void;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
}

function tagClass(tag: string) {
  if (tag === "HOT") return "tag hot";
  if (tag === "COLD") return "tag cold";
  if (tag === "funding" || tag === "news" || tag === "autopilot") return "tag blue";
  if (tag === "WARM" || tag === "hiring" || tag === "tech" || tag === "web") return "tag warm";
  return "tag";
}

export function InboxList({
  notifications,
  selectedId,
  loading,
  unreadCount,
  activeView,
  onSelect,
}: InboxListProps) {
  return (
    <div className="msg-list-pane">
      <div className="mlp-head">
        <span className="title">{VIEW_LABELS[activeView]}</span>
        {unreadCount > 0 && (
          <span className="count-pill">{unreadCount} unread</span>
        )}
        <div className="mlp-actions">
          <div
            className="icon-btn"
            role="button"
            tabIndex={0}
            title="Refresh"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <RefreshCw className={cn("h-[11px] w-[11px]", loading && "animate-spin")} />
          </div>
          <div className="icon-btn" role="button" tabIndex={0} title="Filter">
            <Filter className="h-[11px] w-[11px]" />
          </div>
        </div>
      </div>

      <div className="mlp-tabs">
        <button type="button" className="mlp-tab active">
          All {unreadCount > 0 && <span className="pill">{unreadCount}</span>}
        </button>
        <button type="button" className="mlp-tab">Mentions</button>
        <button type="button" className="mlp-tab">Activity</button>
      </div>

      <div className="msg-list">
        {notifications.length === 0 ? (
          <div className="inbox-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              All caught up
            </div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {activeView === "inbox" ? "No new notifications" : "Nothing here yet"}
            </div>
          </div>
        ) : (
          notifications.map((n) => {
            const hotTag = n.tags.includes("HOT");
            const relTime = formatDistanceToNow(new Date(n.created_at), { addSuffix: false });
            const visibleTags = n.tags.slice(0, 3);
            return (
              <div
                key={n.id}
                className={cn(
                  "msg-row",
                  n.id === selectedId && "selected",
                  !n.is_read && "unread"
                )}
                onClick={() => onSelect(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(n.id)}
              >
                <div
                  className="indicator"
                  style={hotTag ? { background: "var(--band-hot-fill)" } : undefined}
                />
                <div className="body">
                  <div className="top">
                    <span className="from">{n.company_name}</span>
                    <span className="ts">{relTime}</span>
                  </div>
                  <div className="subj">{n.title}</div>
                  <div className="preview">{n.summary}</div>
                  <div className="tags">
                    {visibleTags.map((tag) => (
                      <span key={tag} className={tagClass(tag)}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
