"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WatchlistListTab } from "@/lib/watchlist-stats";

interface WatchlistListTabsProps {
  tabs: WatchlistListTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function WatchlistListTabs({ tabs, activeId, onChange }: WatchlistListTabsProps) {
  return (
    <Tabs value={activeId} onValueChange={onChange} className="block">
      <TabsList
        aria-label="Watchlist lists"
        className="wl-tabs h-auto w-full justify-start rounded-none bg-transparent p-0 text-inherit"
      >
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`wl-tab${active ? " active" : ""}`}
              style={{ borderBottom: active ? "1px solid var(--text-primary)" : "1px solid transparent" }}
            >
              {tab.id !== "all" && tab.color ? (
                <span className="swatch" style={{ background: tab.color }} />
              ) : null}
              {tab.name}
              <span className="pill">{tab.count}</span>
            </TabsTrigger>
          );
        })}
        <Link href="/lists" className="wl-tab" style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}>
          <Plus className="size-3" aria-hidden="true" />
          New list
        </Link>
      </TabsList>
    </Tabs>
  );
}
