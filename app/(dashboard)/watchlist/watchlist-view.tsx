"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toCSV, downloadCSV, csvFilename } from "@/lib/csv";
import type { WatchlistRange, WatchlistStats } from "@/lib/watchlist-stats";
import { WatchlistPageHead } from "@/components/watchlist/watchlist-page-head";
import { WatchlistAlertStrip } from "@/components/watchlist/watchlist-alert-strip";
import { WatchlistListTabs } from "@/components/watchlist/watchlist-list-tabs";
import { WatchlistTable } from "@/components/watchlist/watchlist-table";
import {
  WatchlistQuickAdd,
  type WatchlistQuickAddHandle,
} from "@/components/watchlist/watchlist-quick-add";

import { WATCHLIST_FOCUS_ADD_EVENT } from "@/lib/watchlist-events";

interface WatchlistViewProps {
  initial: WatchlistStats;
}

export function WatchlistView({ initial }: WatchlistViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickAddRef = useRef<WatchlistQuickAddHandle>(null);

  const [entries, setEntries] = useState(initial.entries);
  const [lists, setLists] = useState(initial.lists);
  const [stats, setStats] = useState(initial.stats);
  const [alertItems] = useState(initial.alertItems);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const [activeListId, setActiveListId] = useState("all");
  const [range, setRange] = useState<WatchlistRange>("7D");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initial.entries);
    setLists(initial.lists);
    setStats(initial.stats);
  }, [initial]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    function onFocusAdd() {
      quickAddRef.current?.focus();
    }
    window.addEventListener(WATCHLIST_FOCUS_ADD_EVENT, onFocusAdd);
    return () => window.removeEventListener(WATCHLIST_FOCUS_ADD_EVENT, onFocusAdd);
  }, []);

  const filtered = useMemo(() => {
    let rows = [...entries];
    if (activeListId !== "all") {
      const tab = lists.find((l) => l.id === activeListId);
      if (tab) {
        const domainSet = new Set(tab.domains);
        rows = rows.filter((r) => domainSet.has(r.domain.toLowerCase()));
      }
    }
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) => r.company_name.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [entries, activeListId, lists, query]);

  async function handleAdd(domain: string) {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/dashboard/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      router.refresh();
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(domain: string) {
    setRemoving(domain);
    try {
      await fetch(`/api/dashboard/watchlist?domain=${encodeURIComponent(domain)}`, {
        method: "DELETE",
      });
      const lower = domain.toLowerCase();
      setEntries((prev) => prev.filter((e) => e.domain !== domain));
      setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      setLists((prev) =>
        prev.map((tab) => {
          if (tab.id === "all") return { ...tab, count: Math.max(0, tab.count - 1) };
          if (tab.domains.includes(lower)) {
            return { ...tab, count: Math.max(0, tab.count - 1) };
          }
          return tab;
        }),
      );
    } finally {
      setRemoving(null);
    }
  }

  function handleExport() {
    const csv = toCSV(
      [
        { key: "company", label: "Company" },
        { key: "domain", label: "Domain" },
        { key: "score", label: "Score" },
        { key: "band", label: "Band" },
        { key: "last_scored", label: "Last Scored" },
        { key: "delta", label: "Delta" },
      ],
      filtered.map((r) => ({
        company: r.company_name,
        domain: r.domain,
        score: r.score ?? "",
        band: r.score_band ?? "",
        last_scored: r.last_scored ?? "",
        delta: r.delta ?? "",
      })),
    );
    downloadCSV(csv, csvFilename("watchlist"));
  }

  function toggleSelect(domain: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  return (
    <div className="watchlist-page">
      <WatchlistPageHead
        stats={stats}
        range={range}
        onRangeChange={setRange}
        onExport={handleExport}
      />

      {!alertDismissed && (
        <WatchlistAlertStrip
          items={alertItems}
          onDismiss={() => setAlertDismissed(true)}
          onReview={() => {
            const first = alertItems[0];
            if (first) router.push(`/score?domain=${encodeURIComponent(first.domain)}`);
          }}
        />
      )}

      <WatchlistListTabs tabs={lists} activeId={activeListId} onChange={setActiveListId} />

      <WatchlistTable
        rows={filtered}
        range={range}
        selected={selected}
        onToggleSelect={toggleSelect}
        onRemove={handleRemove}
        removing={removing}
        showAll={showAll}
        onShowAll={() => setShowAll(true)}
      />

      <WatchlistQuickAdd ref={quickAddRef} onAdd={handleAdd} adding={adding} error={addError} />
    </div>
  );
}
