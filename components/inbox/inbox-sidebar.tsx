"use client";

import { Inbox, Star, Clock, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxNotification } from "@/lib/types";
import type { DbList } from "@/lib/lists-types";

type ViewFilter = "inbox" | "subscribed" | "read" | "snoozed";

interface InboxSidebarProps {
  notifications: InboxNotification[];
  lists: Pick<DbList, "id" | "name" | "color" | "icon_initials">[];
  activeView: ViewFilter;
  activeType: string | null;
  activeListId: string | null;
  onSelect: (view: ViewFilter, type: string | null, listId: string | null) => void;
}

export function InboxSidebar({
  notifications,
  lists,
  activeView,
  activeType,
  activeListId,
  onSelect,
}: InboxSidebarProps) {
  const unread = notifications.filter((n) => !n.is_read).length;
  const hotCount = notifications.filter((n) => n.tags.includes("HOT")).length;

  const byType = (type: string) => notifications.filter((n) => n.event_type === type).length;
  const isActive = (view: ViewFilter, type: string | null, listId: string | null) =>
    activeView === view && activeType === type && activeListId === listId;

  return (
    <aside className="inbox-cats">
      <div className="cat-section">All</div>

      <div
        className={cn("cat-item", isActive("inbox", null, null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("inbox", null, null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("inbox", null, null)}
      >
        <Inbox className="ic" />
        Inbox
        {unread > 0 && <span className={cn("count", hotCount > 0 && "hot")}>{unread}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("subscribed", null, null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", null, null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", null, null)}
      >
        <Star className="ic" />
        Subscribed
        {notifications.length > 0 && <span className="count">{notifications.length}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("read", null, null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("read", null, null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("read", null, null)}
      >
        <CheckCheck className="ic" />
        Read
      </div>

      <div
        className={cn("cat-item", isActive("snoozed", null, null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("snoozed", null, null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("snoozed", null, null)}
      >
        <Clock className="ic" />
        Snoozed
      </div>

      <div className="cat-section" style={{ marginTop: 12 }}>By type</div>

      <div
        className={cn("cat-item", isActive("subscribed", "hot_crossing", null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", "hot_crossing", null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", "hot_crossing", null)}
      >
        <span className="swatch" style={{ background: "var(--band-hot-fill)" }} />
        HOT crossings
        {byType("hot_crossing") > 0 && <span className="count hot">{byType("hot_crossing")}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("subscribed", "autopilot_fire", null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", "autopilot_fire", null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", "autopilot_fire", null)}
      >
        <span className="swatch" style={{ background: "var(--accent-2)" }} />
        Autopilot fires
        {byType("autopilot_fire") > 0 && <span className="count">{byType("autopilot_fire")}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("subscribed", "stage_change", null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", "stage_change", null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", "stage_change", null)}
      >
        <span className="swatch" style={{ background: "var(--band-warm-fill)" }} />
        Signal events
        {byType("stage_change") > 0 && <span className="count">{byType("stage_change")}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("subscribed", "reply_activity", null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", "reply_activity", null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", "reply_activity", null)}
      >
        <span className="swatch" style={{ background: "var(--cyan)" }} />
        Replies + activity
        {byType("reply_activity") > 0 && <span className="count">{byType("reply_activity")}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("subscribed", "score_drop", null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", "score_drop", null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", "score_drop", null)}
      >
        <span className="swatch" style={{ background: "var(--band-cold-fill)" }} />
        Score drops
        {byType("score_drop") > 0 && <span className="count">{byType("score_drop")}</span>}
      </div>

      <div
        className={cn("cat-item", isActive("subscribed", "system", null) && "active")}
        role="button"
        tabIndex={0}
        onClick={() => onSelect("subscribed", "system", null)}
        onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", "system", null)}
      >
        <span className="swatch" style={{ background: "var(--pink, #8a8f98)" }} />
        System
        {byType("system") > 0 && <span className="count">{byType("system")}</span>}
      </div>

      {lists.length > 0 && (
        <>
          <div className="cat-section" style={{ marginTop: 12 }}>Lists</div>
          {lists.map((list) => {
            const count = notifications.filter((n) => n.list_id === list.id).length;
            return (
              <div
                key={list.id}
                className={cn("cat-item", isActive("subscribed", null, list.id) && "active")}
                role="button"
                tabIndex={0}
                onClick={() => onSelect("subscribed", null, list.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect("subscribed", null, list.id)}
              >
                <svg className="ic" viewBox="0 0 14 14" fill="none" width="14" height="14">
                  <circle cx="7" cy="7" r="3" fill={list.color || "var(--accent)"} stroke="none" />
                </svg>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {list.name}
                </span>
                {count > 0 && <span className="count">{count}</span>}
              </div>
            );
          })}
        </>
      )}
    </aside>
  );
}
